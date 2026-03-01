import { NextResponse } from 'next/server';
import { NormalizedArticle, NewsResponse } from '@/lib/news-types';

// ClinicalTrials.gov API v2 - no API key required
const CT_BASE = 'https://clinicaltrials.gov/api/v2/studies';

// Focused search terms for digital health, AI, and health tech
const SEARCH_QUERIES = [
  // Primary digital health terms
  '"artificial intelligence" OR "machine learning" OR "deep learning"',
  '"digital health" OR "digital therapeutic" OR "mobile health" OR "mHealth"',
  '"remote monitoring" OR "remote patient monitoring" OR "RPM"',
  '"wearable" OR "wearable device" OR "smartwatch"',
  '"telehealth" OR "telemedicine" OR "virtual care"',
  '"software as a medical device" OR "SaMD"',
];

export async function GET() {
  try {
    // Try multiple search queries to get diverse results
    const allStudies: any[] = [];

    // Use a combined search for efficiency
    const combinedQuery = encodeURIComponent(
      '(artificial intelligence OR machine learning OR digital health OR digital therapeutic OR ' +
      'remote monitoring OR wearable OR telehealth OR telemedicine OR mobile app OR ' +
      'smartphone OR software device OR algorithm OR automated)'
    );

    const params = new URLSearchParams({
      'query.term': combinedQuery,
      'filter.overallStatus': 'RECRUITING,NOT_YET_RECRUITING,ENROLLING_BY_INVITATION',
      'sort': 'LastUpdatePostDate:desc',
      'pageSize': '50', // Fetch more to filter
      'fields': 'NCTId,BriefTitle,OfficialTitle,BriefSummary,LeadSponsorName,LastUpdatePostDate,OverallStatus,EnrollmentInfo,StudyType,Condition,InterventionName',
    });

    const url = `${CT_BASE}?${params}`;

    const response = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.studies || data.studies.length === 0) {
      throw new Error('No clinical trial results');
    }

    // Filter for the most relevant digital health studies
    const relevantStudies = data.studies.filter((study: any) => {
      const proto = study.protocolSection || {};
      const idModule = proto.identificationModule || {};
      const descModule = proto.descriptionModule || {};
      const armsModule = proto.armsInterventionsModule || {};

      const title = (idModule.briefTitle || '').toLowerCase();
      const summary = (descModule.briefSummary || '').toLowerCase();
      const interventions = (armsModule.interventions || [])
        .map((i: any) => (i.name || '').toLowerCase())
        .join(' ');

      const allText = `${title} ${summary} ${interventions}`;

      // Must contain at least one strong digital health indicator
      const strongIndicators = [
        'artificial intelligence', 'machine learning', 'ai-', 'ai algorithm',
        'digital therapeutic', 'digital health', 'mobile app', 'smartphone app',
        'wearable', 'remote monitoring', 'telehealth', 'telemedicine',
        'software', 'algorithm', 'automated', 'computer-aided',
        'virtual reality', 'vr ', 'augmented reality', 'ar ',
        'chatbot', 'conversational', 'app-based', 'web-based',
      ];

      return strongIndicators.some((indicator) => allText.includes(indicator));
    });

    // Normalize the filtered results
    const articles: NormalizedArticle[] = relevantStudies
      .slice(0, 20)
      .map((study: any, index: number) => normalizeTrialItem(study, index));

    if (articles.length >= 5) {
      return NextResponse.json<NewsResponse>({
        articles,
        isPlaceholder: false,
        category: 'trials',
      });
    }

    // If not enough filtered results, use all results
    const allArticles: NormalizedArticle[] = data.studies
      .slice(0, 20)
      .map((study: any, index: number) => normalizeTrialItem(study, index));

    return NextResponse.json<NewsResponse>({
      articles: allArticles.length > 0 ? allArticles : getPlaceholderArticles(),
      isPlaceholder: allArticles.length === 0,
      category: 'trials',
    });
  } catch (error) {
    console.error('Failed to fetch clinical trials:', error);
    return NextResponse.json<NewsResponse>({
      articles: getPlaceholderArticles(),
      isPlaceholder: true,
      error: 'Failed to fetch clinical trials',
      category: 'trials',
    });
  }
}

function normalizeTrialItem(study: any, index: number): NormalizedArticle {
  const proto = study.protocolSection || {};
  const idModule = proto.identificationModule || {};
  const descModule = proto.descriptionModule || {};
  const statusModule = proto.statusModule || {};
  const sponsorModule = proto.sponsorCollaboratorsModule || {};
  const designModule = proto.designModule || {};
  const conditionsModule = proto.conditionsModule || {};
  const armsModule = proto.armsInterventionsModule || {};

  const nctId = idModule.nctId || '';
  const title = idModule.briefTitle || idModule.officialTitle || 'Untitled Study';
  const summary = descModule.briefSummary || '';
  const sponsor = sponsorModule.leadSponsor?.name || 'Unknown Sponsor';
  const status = statusModule.overallStatus || 'Unknown';
  const lastUpdate = statusModule.lastUpdatePostDateStruct?.date || '';
  const studyType = designModule.studyType || '';
  const enrollment = designModule.enrollmentInfo?.count || '';
  const conditions = conditionsModule.conditions || [];
  const interventions = armsModule.interventions || [];

  // Format date
  let publishedAt = new Date().toISOString();
  if (lastUpdate) {
    try {
      publishedAt = new Date(lastUpdate).toISOString();
    } catch { /* keep default */ }
  }

  // Get intervention names
  const interventionNames = interventions
    .map((i: any) => i.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');

  // Build concise description
  const conditionText = conditions.slice(0, 2).join(', ');
  const description = `${status} · ${studyType || 'Clinical Trial'}${conditionText ? ` · ${conditionText}` : ''}${interventionNames ? ` · Intervention: ${interventionNames}` : ''}`;

  // Build content
  const contentParts = [
    `Status: ${status}`,
    `Sponsor: ${sponsor}`,
    studyType ? `Study Type: ${studyType}` : '',
    enrollment ? `Target Enrollment: ${enrollment} participants` : '',
    conditions.length > 0 ? `Conditions: ${conditions.join(', ')}` : '',
    interventionNames ? `Interventions: ${interventionNames}` : '',
    '',
    summary ? summary.substring(0, 600) : '',
  ].filter(Boolean);

  return {
    id: `trial-${nctId || index}-${Date.now()}`,
    title,
    source: sponsor,
    description,
    content: contentParts.join('\n'),
    url: `https://clinicaltrials.gov/study/${nctId}`,
    imageUrl: null,
    publishedAt,
    category: 'trials',
  };
}

function getPlaceholderArticles(): NormalizedArticle[] {
  return [
    {
      id: 'trial-placeholder-1',
      title: 'AI-Assisted Mammography Screening in Community Settings',
      source: 'Stanford University',
      description: 'RECRUITING · Interventional · Breast Cancer · Intervention: AI Diagnostic Software',
      content: 'Status: RECRUITING\nSponsor: Stanford University\nStudy Type: Interventional\nTarget Enrollment: 5000 participants\nConditions: Breast Cancer Screening\nInterventions: AI Diagnostic Software\n\nMulti-site study evaluating AI-assisted mammography interpretation in community health settings to improve early detection rates.',
      url: 'https://clinicaltrials.gov/study/NCT00000001',
      imageUrl: null,
      publishedAt: new Date().toISOString(),
      category: 'trials',
    },
    {
      id: 'trial-placeholder-2',
      title: 'Wearable-Based Remote Monitoring for Heart Failure Patients',
      source: 'Mayo Clinic',
      description: 'RECRUITING · Interventional · Heart Failure · Intervention: Wearable ECG Monitor',
      content: 'Status: RECRUITING\nSponsor: Mayo Clinic\nStudy Type: Interventional\nTarget Enrollment: 800 participants\nConditions: Heart Failure\nInterventions: Wearable ECG Monitor, Mobile App\n\nEvaluating continuous remote monitoring with wearable devices to reduce hospital readmissions.',
      url: 'https://clinicaltrials.gov/study/NCT00000002',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      category: 'trials',
    },
    {
      id: 'trial-placeholder-3',
      title: 'Digital CBT App for Treatment-Resistant Depression',
      source: 'Johns Hopkins University',
      description: 'RECRUITING · Interventional · Depression · Intervention: Digital Therapeutic App',
      content: 'Status: RECRUITING\nSponsor: Johns Hopkins University\nStudy Type: Interventional\nTarget Enrollment: 400 participants\nConditions: Major Depressive Disorder\nInterventions: Digital CBT App\n\nComparing app-based cognitive behavioral therapy to traditional in-person therapy.',
      url: 'https://clinicaltrials.gov/study/NCT00000003',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      category: 'trials',
    },
    {
      id: 'trial-placeholder-4',
      title: 'Machine Learning Algorithm for Early Sepsis Detection',
      source: 'Cleveland Clinic',
      description: 'RECRUITING · Observational · Sepsis · Intervention: ML Prediction Algorithm',
      content: 'Status: RECRUITING\nSponsor: Cleveland Clinic\nStudy Type: Observational\nTarget Enrollment: 3000 participants\nConditions: Sepsis\nInterventions: ML Prediction Algorithm\n\nValidating a machine learning algorithm that predicts sepsis 6 hours before clinical presentation.',
      url: 'https://clinicaltrials.gov/study/NCT00000004',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      category: 'trials',
    },
    {
      id: 'trial-placeholder-5',
      title: 'Virtual Reality Therapy for Chronic Pain Management',
      source: 'Cedars-Sinai',
      description: 'RECRUITING · Interventional · Chronic Pain · Intervention: VR Therapeutic System',
      content: 'Status: RECRUITING\nSponsor: Cedars-Sinai\nStudy Type: Interventional\nTarget Enrollment: 200 participants\nConditions: Chronic Pain\nInterventions: VR Therapeutic System\n\nEvaluating immersive VR experiences as a non-pharmacological approach to chronic pain management.',
      url: 'https://clinicaltrials.gov/study/NCT00000005',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      category: 'trials',
    },
  ];
}
