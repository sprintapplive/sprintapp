import { NextResponse } from 'next/server';
import { NormalizedArticle, NewsResponse } from '@/lib/news-types';

// openFDA API - no API key required for basic access
const OPENFDA_BASE = 'https://api.fda.gov/device/510k.json';

// Focus on digital health, software, AI, and connected device product codes
// These are advisory committee and product code filters for relevant devices
const RELEVANT_KEYWORDS = [
  'software', 'digital', 'algorithm', 'artificial intelligence', 'ai',
  'machine learning', 'mobile', 'app', 'wireless', 'bluetooth', 'connected',
  'remote', 'monitoring', 'telehealth', 'telemedicine', 'wearable',
  'diagnostic', 'imaging', 'analysis', 'detection', 'screening',
  'glucose', 'cardiac', 'ecg', 'ekg', 'heart', 'blood pressure',
  'pulse', 'oximeter', 'respiratory', 'sleep',
];

// Advisory committees most relevant to digital health
const RELEVANT_COMMITTEES = [
  'radiology', 'clinical chemistry', 'cardiovascular', 'neurology',
  'anesthesiology', 'general hospital', 'pathology',
];

export async function GET() {
  try {
    // Fetch recent 510(k) clearances from last 120 days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 120);
    const dateFilter = daysAgo.toISOString().split('T')[0].replace(/-/g, '');

    // Fetch more results to filter down
    const url = `${OPENFDA_BASE}?search=decision_date:[${dateFilter}+TO+*]&sort=decision_date:desc&limit=100`;

    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`openFDA error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No FDA results');
    }

    // Filter for digital health / software related devices
    const relevantDevices = data.results.filter((item: any) => {
      const deviceName = (item.device_name || '').toLowerCase();
      const statement = (item.statement_or_summary || '').toLowerCase();
      const committee = (item.review_advisory_committee || '').toLowerCase();

      // Check if device name or statement contains relevant keywords
      const hasRelevantKeyword = RELEVANT_KEYWORDS.some(
        (keyword) => deviceName.includes(keyword) || statement.includes(keyword)
      );

      // Check if it's from a relevant advisory committee
      const hasRelevantCommittee = RELEVANT_COMMITTEES.some(
        (comm) => committee.includes(comm)
      );

      // Include if it has relevant keywords OR is from a relevant committee with a software-like name
      return hasRelevantKeyword || (hasRelevantCommittee && (
        deviceName.includes('system') ||
        deviceName.includes('monitor') ||
        deviceName.includes('device') ||
        deviceName.includes('analyzer')
      ));
    });

    // Take top 20 after filtering
    const articles: NormalizedArticle[] = relevantDevices
      .slice(0, 20)
      .map((item: any, index: number) => normalizeFdaItem(item, index));

    // If we have at least 5 relevant devices, return them
    if (articles.length >= 5) {
      return NextResponse.json<NewsResponse>({
        articles,
        isPlaceholder: false,
        category: 'fda',
      });
    }

    // Otherwise, return recent clearances without strict filtering
    const fallbackArticles: NormalizedArticle[] = data.results
      .slice(0, 20)
      .map((item: any, index: number) => normalizeFdaItem(item, index));

    return NextResponse.json<NewsResponse>({
      articles: fallbackArticles,
      isPlaceholder: false,
      category: 'fda',
    });
  } catch (error) {
    console.error('Failed to fetch FDA data:', error);
    return NextResponse.json<NewsResponse>({
      articles: getPlaceholderArticles(),
      isPlaceholder: true,
      error: 'Failed to fetch FDA clearances',
      category: 'fda',
    });
  }
}

function normalizeFdaItem(item: any, index: number): NormalizedArticle {
  const deviceName = item.device_name || 'Unknown Device';
  const applicant = item.applicant || 'Unknown Applicant';
  const productCode = item.product_code || '';
  const kNumber = item.k_number || '';
  const decisionDate = item.decision_date || '';
  const statement = item.statement_or_summary || '';
  const committee = item.review_advisory_committee || '';

  // Format the decision date
  let publishedAt = new Date().toISOString();
  if (decisionDate && decisionDate.length === 8) {
    const year = decisionDate.substring(0, 4);
    const month = decisionDate.substring(4, 6);
    const day = decisionDate.substring(6, 8);
    publishedAt = new Date(`${year}-${month}-${day}`).toISOString();
  }

  // Build concise description
  const description = `510(k) cleared: ${deviceName}. Applicant: ${applicant}.${committee ? ` Committee: ${committee}.` : ''}`;

  // Build content with key details
  const contentParts = [
    `Device: ${deviceName}`,
    `Applicant: ${applicant}`,
    `510(k) Number: ${kNumber}`,
    productCode ? `Product Code: ${productCode}` : '',
    committee ? `Advisory Committee: ${committee}` : '',
    '',
    statement ? statement.substring(0, 500) : 'No summary available.',
  ].filter(Boolean);

  return {
    id: `fda-${kNumber || index}-${Date.now()}`,
    title: `FDA Clears: ${deviceName}`,
    source: applicant,
    description,
    content: contentParts.join('\n'),
    url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${kNumber}`,
    imageUrl: null,
    publishedAt,
    category: 'fda',
  };
}

function getPlaceholderArticles(): NormalizedArticle[] {
  return [
    {
      id: 'fda-placeholder-1',
      title: 'FDA Clears: AI-Powered Chest X-Ray Analysis Software',
      source: 'Radiology AI Inc.',
      description: '510(k) cleared: AI-Powered Chest X-Ray Analysis Software. Applicant: Radiology AI Inc. Committee: Radiology.',
      content: 'Device: AI-Powered Chest X-Ray Analysis Software\nApplicant: Radiology AI Inc.\n510(k) Number: K242156\nProduct Code: QAS\nAdvisory Committee: Radiology\n\nThis AI software assists radiologists in detecting pulmonary nodules and other abnormalities in chest X-rays with 95% sensitivity.',
      url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm',
      imageUrl: null,
      publishedAt: new Date().toISOString(),
      category: 'fda',
    },
    {
      id: 'fda-placeholder-2',
      title: 'FDA Clears: Continuous Glucose Monitor with AI Predictions',
      source: 'GlucoSense Medical',
      description: '510(k) cleared: Continuous Glucose Monitor with AI Predictions. Applicant: GlucoSense Medical. Committee: Clinical Chemistry.',
      content: 'Device: Continuous Glucose Monitor with AI Predictions\nApplicant: GlucoSense Medical\n510(k) Number: K242089\nProduct Code: NBW\nAdvisory Committee: Clinical Chemistry\n\nNext-gen CGM with machine learning algorithm that predicts glucose levels 60 minutes ahead.',
      url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      category: 'fda',
    },
    {
      id: 'fda-placeholder-3',
      title: 'FDA Clears: Remote Cardiac Monitoring System',
      source: 'HeartWatch Digital',
      description: '510(k) cleared: Remote Cardiac Monitoring System. Applicant: HeartWatch Digital. Committee: Cardiovascular.',
      content: 'Device: Remote Cardiac Monitoring System\nApplicant: HeartWatch Digital\n510(k) Number: K241998\nProduct Code: DRX\nAdvisory Committee: Cardiovascular\n\nWireless patch that monitors ECG, heart rate, and detects arrhythmias with real-time alerts to physicians.',
      url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      category: 'fda',
    },
    {
      id: 'fda-placeholder-4',
      title: 'FDA Clears: AI Skin Cancer Detection Mobile App',
      source: 'DermAI Technologies',
      description: '510(k) cleared: AI Skin Cancer Detection Mobile App. Applicant: DermAI Technologies. Committee: General Hospital.',
      content: 'Device: AI Skin Cancer Detection Mobile App\nApplicant: DermAI Technologies\n510(k) Number: K241876\nProduct Code: QBS\nAdvisory Committee: General Hospital\n\nSmartphone app that analyzes photos of skin lesions to assess melanoma risk.',
      url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      category: 'fda',
    },
    {
      id: 'fda-placeholder-5',
      title: 'FDA Clears: Sleep Apnea Detection Wearable',
      source: 'RestWell Health',
      description: '510(k) cleared: Sleep Apnea Detection Wearable. Applicant: RestWell Health. Committee: Neurology.',
      content: 'Device: Sleep Apnea Detection Wearable\nApplicant: RestWell Health\n510(k) Number: K241765\nProduct Code: MOA\nAdvisory Committee: Neurology\n\nWrist-worn device that detects sleep apnea events using SpO2 and movement sensors.',
      url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      category: 'fda',
    },
  ];
}
