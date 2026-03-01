import {NextRequest, NextResponse } from 'next/server';

// Supported DNS record types
type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';

// DNS record type to numeric code mapping (per DNS spec)
const RECORD_TYPE_CODES: Record<DNSRecordType, number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  MX: 15,
  TXT: 16,
  NS: 2,
};

// Response structure from DoH providers
interface DoHResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: Array<{
    name: string;
    type: number;
  }>;
  Answer?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
  Authority?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
  Comment?: string;
}

// Our normalized response structure
interface DNSRecord {
  name: string;
  type: string;
  ttl: number;
  data: string;
  priority?: number; // For MX records
}

interface DNSLookupResponse {
  success: boolean;
  domain: string;
  recordType: string;
  records: DNSRecord[];
  queryTime: number;
  provider: string;
  error?: string;
}

// Parse MX record data to extract priority
function parseMXRecord(data: string): { priority: number; exchange: string } {
  const parts = data.split(' ');
  if (parts.length >= 2) {
    return {
      priority: parseInt(parts[0], 10) || 0,
      exchange: parts.slice(1).join(' ').replace(/\.$/, ''),
    };
  }
  return { priority: 0, exchange: data };
}

// Get record type name from numeric code
function getRecordTypeName(typeCode: number): string {
  const typeNames: Record<number, string> = {
    1: 'A',
    28: 'AAAA',
    5: 'CNAME',
    15: 'MX',
    16: 'TXT',
    2: 'NS',
    6: 'SOA',
    12: 'PTR',
    33: 'SRV',
    257: 'CAA',
  };
  return typeNames[typeCode] || `TYPE${typeCode}`;
}

// Clean up record data (remove trailing dots, clean TXT records)
function cleanRecordData(data: string, type: string): string {
  let cleaned = data.replace(/\.$/, ''); // Remove trailing dot

  // TXT records often have surrounding quotes
  if (type === 'TXT' && cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned;
}

// Query DNS using Cloudflare DoH
async function queryCloudflare(
  domain: string,
  type: DNSRecordType
): Promise<DoHResponse> {
  const typeCode = RECORD_TYPE_CODES[type];
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${typeCode}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/dns-json',
    },
  });

  if (!response.ok) {
    throw new Error(`Cloudflare DNS query failed: ${response.statusText}`);
  }

  return response.json();
}

// Query DNS using Google DoH (fallback)
async function queryGoogle(
  domain: string,
  type: DNSRecordType
): Promise<DoHResponse> {
  const typeCode = RECORD_TYPE_CODES[type];
  const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${typeCode}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/dns-json',
    },
  });

  if (!response.ok) {
    throw new Error(`Google DNS query failed: ${response.statusText}`);
  }

  return response.json();
}

// Validate domain name format
function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;

  // Basic domain validation regex
  const domainRegex =
    /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}$/;

  // Also allow punycode domains
  const punycodeRegex =
    /^(?!-)(xn--)?[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}$/;

  return domainRegex.test(domain) || punycodeRegex.test(domain);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  const domain = searchParams.get('domain')?.trim().toLowerCase();
  const type = (searchParams.get('type')?.toUpperCase() || 'A') as DNSRecordType;
  const provider = searchParams.get('provider')?.toLowerCase() || 'cloudflare';

  // Validate domain
  if (!domain) {
    return NextResponse.json(
      {
        success: false,
        error: 'Domain parameter is required',
        domain: '',
        recordType: type,
        records: [],
        queryTime: Date.now() - startTime,
        provider,
      } as DNSLookupResponse,
      { status: 400 }
    );
  }

  // Remove protocol if present
  const cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');

  if (!isValidDomain(cleanDomain)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid domain format',
        domain: cleanDomain,
        recordType: type,
        records: [],
        queryTime: Date.now() - startTime,
        provider,
      } as DNSLookupResponse,
      { status: 400 }
    );
  }

  // Validate record type
  if (!RECORD_TYPE_CODES[type]) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid record type. Supported types: ${Object.keys(RECORD_TYPE_CODES).join(', ')}`,
        domain: cleanDomain,
        recordType: type,
        records: [],
        queryTime: Date.now() - startTime,
        provider,
      } as DNSLookupResponse,
      { status: 400 }
    );
  }

  try {
    let dohResponse: DoHResponse;
    let usedProvider = provider;

    // Try primary provider, fallback to secondary
    try {
      if (provider === 'google') {
        dohResponse = await queryGoogle(cleanDomain, type);
        usedProvider = 'google';
      } else {
        dohResponse = await queryCloudflare(cleanDomain, type);
        usedProvider = 'cloudflare';
      }
    } catch (primaryError) {
      // Fallback to other provider
      console.warn(`Primary DNS provider failed, trying fallback:`, primaryError);
      if (provider === 'google') {
        dohResponse = await queryCloudflare(cleanDomain, type);
        usedProvider = 'cloudflare';
      } else {
        dohResponse = await queryGoogle(cleanDomain, type);
        usedProvider = 'google';
      }
    }

    // Check for DNS errors
    if (dohResponse.Status !== 0) {
      const dnsErrors: Record<number, string> = {
        1: 'Format error - DNS server unable to interpret query',
        2: 'Server failure - DNS server encountered an internal error',
        3: 'Domain does not exist (NXDOMAIN)',
        4: 'Not implemented - DNS server does not support requested query type',
        5: 'Query refused - DNS server refused the query',
      };

      return NextResponse.json(
        {
          success: false,
          error: dnsErrors[dohResponse.Status] || `DNS error code: ${dohResponse.Status}`,
          domain: cleanDomain,
          recordType: type,
          records: [],
          queryTime: Date.now() - startTime,
          provider: usedProvider,
        } as DNSLookupResponse,
        { status: 200 } // Return 200 as it's a valid DNS response, just no records
      );
    }

    // Process answer records
    const records: DNSRecord[] = [];

    if (dohResponse.Answer && dohResponse.Answer.length > 0) {
      for (const answer of dohResponse.Answer) {
        const recordTypeName = getRecordTypeName(answer.type);
        const cleanedData = cleanRecordData(answer.data, recordTypeName);

        const record: DNSRecord = {
          name: answer.name.replace(/\.$/, ''),
          type: recordTypeName,
          ttl: answer.TTL,
          data: cleanedData,
        };

        // Parse MX records for priority
        if (recordTypeName === 'MX') {
          const mxData = parseMXRecord(answer.data);
          record.priority = mxData.priority;
          record.data = mxData.exchange;
        }

        records.push(record);
      }
    }

    // Sort MX records by priority
    if (type === 'MX') {
      records.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    }

    return NextResponse.json(
      {
        success: true,
        domain: cleanDomain,
        recordType: type,
        records,
        queryTime: Date.now() - startTime,
        provider: usedProvider,
      } as DNSLookupResponse,
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    console.error('DNS lookup error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform DNS lookup',
        domain: cleanDomain,
        recordType: type,
        records: [],
        queryTime: Date.now() - startTime,
        provider,
      } as DNSLookupResponse,
      { status: 500 }
    );
  }
}
