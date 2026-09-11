import {
  CatalogSourceKind,
  DocumentType,
  PrismaClient,
} from '@prisma/client';

export const CATALOG_DIMENSIONS = [
  {
    code: 'basilar',
    name: 'Basilar',
    description: 'Fundamentos legais e contratuais obrigatórios',
  },
  {
    code: 'clausulas',
    name: 'Cláusulas',
    description: 'Cláusulas típicas e redação contratual',
  },
  {
    code: 'tipos_prestacao',
    name: 'Tipos de prestação',
    description: 'Modalidades de prestação assistencial',
  },
  {
    code: 'elementos_controle',
    name: 'Elementos de controle',
    description: 'Controles operacionais e contratuais',
  },
  {
    code: 'elementos_alerta',
    name: 'Elementos de alerta',
    description: 'Gatilhos e sinais de risco',
  },
  {
    code: 'tipos_manutencao',
    name: 'Tipos de manutenção',
    description: 'Manutenção, reajuste e aditivos',
  },
  {
    code: 'previsibilidade',
    name: 'Previsibilidade',
    description: 'Clareza de vigência, valores e escopo',
  },
  {
    code: 'acordabilidade',
    name: 'Acordabilidade',
    description: 'Espaço de negociação e formalização',
  },
  {
    code: 'plausabilidade',
    name: 'Plausabilidade',
    description: 'Coerência entre peças e prática',
  },
  {
    code: 'sinalizacao',
    name: 'Sinalização',
    description: 'Como o instrumento sinaliza mudanças',
  },
  {
    code: 'monitoramento',
    name: 'Monitoramento',
    description: 'Acompanhamento contínuo pós-assinatura',
  },
  {
    code: 'adequacao',
    name: 'Adequação',
    description: 'Adequação regulatória (ANS/RN e correlatos)',
  },
  {
    code: 'pontos_verificacao',
    name: 'Pontos de verificação',
    description: 'Checklist de verificação humana',
  },
  {
    code: 'pontos_controle',
    name: 'Pontos de controle',
    description: 'Pontos de controle no fluxo do dossiê',
  },
] as const;

export type CatalogDimensionCode =
  (typeof CATALOG_DIMENSIONS)[number]['code'];

export type SeedInstrument = {
  code: string;
  title: string;
  sourceKind: CatalogSourceKind;
  sourceUrl?: string;
  localPath?: string;
  publisher?: string;
  summary?: string;
  tags?: string[];
  /** DocumentType hint for caso_base import */
  documentType?: DocumentType;
  dimensions: Array<{
    code: CatalogDimensionCode;
    notes?: string;
  }>;
};

export const CATALOG_INSTRUMENTS: SeedInstrument[] = [
  {
    code: 'ans-obrigatoriedade-contrato-escrito',
    title: 'ANS — Obrigatoriedade do contrato escrito',
    sourceKind: 'ans',
    sourceUrl:
      'https://www.gov.br/ans/pt-br/assuntos/prestadores/fator-de-qualidade-1/obrigatoriedade-do-contrato-escrito',
    publisher: 'Agência Nacional de Saúde Suplementar (ANS)',
    summary:
      'Orientação regulatória sobre a obrigatoriedade de contrato escrito entre operadora e prestador.',
    tags: ['ans', 'contrato_escrito', 'prestadores'],
    dimensions: [
      { code: 'basilar', notes: 'Exigência formal do vínculo' },
      { code: 'adequacao' },
      { code: 'pontos_verificacao' },
    ],
  },
  {
    code: 'ans-fator-de-qualidade',
    title: 'ANS — Fator de qualidade',
    sourceKind: 'ans',
    sourceUrl:
      'https://www.gov.br/ans/pt-br/assuntos/prestadores/fator-de-qualidade-1/fator-de-qualidade',
    publisher: 'Agência Nacional de Saúde Suplementar (ANS)',
    summary:
      'Referência ao fator de qualidade na relação operadora–prestador.',
    tags: ['ans', 'qualidade', 'prestadores'],
    dimensions: [
      { code: 'basilar' },
      { code: 'elementos_controle' },
      { code: 'monitoramento' },
      { code: 'adequacao' },
    ],
  },
  {
    code: 'cfm-modelo-contrato-operadoras',
    title: 'CFM — Modelo de contrato com operadoras de planos de saúde',
    sourceKind: 'cfm',
    sourceUrl:
      'https://portal.cfm.org.br/noticias/modelo-de-contrato-com-as-operadoras-de-planos-de-saude',
    publisher: 'Conselho Federal de Medicina (CFM)',
    summary:
      'Notícia/orientação CFM sobre modelo de contrato com operadoras (referência externa).',
    tags: ['cfm', 'modelo', 'operadoras'],
    dimensions: [
      { code: 'clausulas' },
      { code: 'tipos_prestacao' },
      { code: 'acordabilidade' },
      { code: 'basilar' },
    ],
  },
  {
    code: 'asamp-contrato-plano-2017',
    title: 'ASAMP — Contrato do plano de saúde (2017)',
    sourceKind: 'associacao',
    sourceUrl:
      'https://www.asamp.com.br/media/asamp/contrato_do_plano_de_saúde_da_asamp_2017.pdf',
    publisher: 'ASAMP',
    summary:
      'Minuta/contrato associativo publicado pela ASAMP — referência estrutural.',
    tags: ['associacao', 'minuta', 'pdf'],
    dimensions: [
      { code: 'clausulas' },
      { code: 'tipos_prestacao' },
      { code: 'previsibilidade' },
      { code: 'pontos_controle' },
    ],
  },
  {
    code: 'jusbrasil-termo-aditivo-retificacao',
    title: 'Jusbrasil — Modelo termo aditivo de retificação e ratificação',
    sourceKind: 'jusbrasil',
    sourceUrl:
      'https://www.jusbrasil.com.br/modelos-pecas/modelo-de-termo-aditivo-de-retificacao-e-ratificacao-ao-convenio-de-prestacao-de-servicos-medico-hospitalares/780101661',
    publisher: 'Jusbrasil (modelo)',
    summary:
      'Referência de estrutura de termo aditivo (metadados/URL apenas; sem texto integral no repositório). Índice de modelos: https://www.jusbrasil.com.br/modelos-pecas',
    tags: ['jusbrasil', 'aditivo', 'referencia'],
    dimensions: [
      { code: 'tipos_manutencao' },
      { code: 'clausulas' },
      { code: 'sinalizacao' },
    ],
  },
  {
    code: 'jusbrasil-prestacao-servicos-medico-hospitalares',
    title: 'Jusbrasil — Modelo prestação de serviços médico-hospitalares',
    sourceKind: 'jusbrasil',
    sourceUrl:
      'https://www.jusbrasil.com.br/modelos-pecas/modelo-de-prestacao-de-servicos-medicos-hospitalares/780099806',
    publisher: 'Jusbrasil (modelo)',
    summary:
      'Índice/referência de modelo de prestação médico-hospitalar. Busca de modelos: https://www.jusbrasil.com.br/modelos-pecas',
    tags: ['jusbrasil', 'prestacao', 'referencia'],
    dimensions: [
      { code: 'tipos_prestacao' },
      { code: 'clausulas' },
      { code: 'plausabilidade' },
    ],
  },
  {
    code: 'jusbrasil-contrato-hospitalizacao-ambulatorial',
    title:
      'Jusbrasil — Contrato assistência médica cirúrgica (hospitalização e ambulatorial)',
    sourceKind: 'jusbrasil',
    sourceUrl:
      'https://www.jusbrasil.com.br/modelos-pecas/modelo-de-contrato-de-prestacao-de-servicos-de-assistencia-medica-cirurgica-em-regime-de-hospitalizacao-e-ambulatorial/780099364',
    publisher: 'Jusbrasil (modelo)',
    summary:
      'Referência de modelo hospitalar/ambulatorial. Índice: https://www.jusbrasil.com.br/modelos-pecas',
    tags: ['jusbrasil', 'hospitalar', 'ambulatorial'],
    dimensions: [
      { code: 'tipos_prestacao' },
      { code: 'elementos_controle' },
      { code: 'previsibilidade' },
    ],
  },
  {
    code: 'jusbrasil-contrato-medico-hospitalares',
    title: 'Jusbrasil — Contrato de prestação médico-hospitalares',
    sourceKind: 'jusbrasil',
    sourceUrl:
      'https://www.jusbrasil.com.br/modelos-pecas/modelo-de-contrato-de-prestacao-de-servicos-medico-hospitalares/780099369',
    publisher: 'Jusbrasil (modelo)',
    summary:
      'Referência de modelo de contrato médico-hospitalar. Índice: https://www.jusbrasil.com.br/modelos-pecas',
    tags: ['jusbrasil', 'contrato'],
    dimensions: [
      { code: 'clausulas' },
      { code: 'basilar' },
      { code: 'pontos_verificacao' },
    ],
  },
  {
    code: 'jusbrasil-contrato-saude-lgpd-terceirizacao',
    title:
      'Jusbrasil — Contrato área da saúde (LGPD e lei da terceirização)',
    sourceKind: 'jusbrasil',
    sourceUrl:
      'https://www.jusbrasil.com.br/modelos-pecas/contrato-de-prestacao-de-servicos-area-da-saude-de-acordo-com-a-lgpd-e-lei-da-terceirizacao/1502378160',
    publisher: 'Jusbrasil (modelo)',
    summary:
      'Referência de cláusulas LGPD/terceirização em saúde. Índice: https://www.jusbrasil.com.br/modelos-pecas',
    tags: ['jusbrasil', 'lgpd', 'terceirizacao'],
    dimensions: [
      { code: 'clausulas' },
      { code: 'adequacao' },
      { code: 'elementos_alerta' },
    ],
  },
  {
    code: 'selbach-contrato-anexo',
    title: 'Selbach/RS — Anexo de contratos públicos (PDF)',
    sourceKind: 'outro',
    sourceUrl:
      'https://selbach.rs.gov.br/system/filemanager/files/contratos_anexos_275_275_1488565593.pdf',
    publisher: 'Prefeitura de Selbach / RS',
    summary: 'PDF público de anexo contratual — referência estrutural.',
    tags: ['publico', 'anexo', 'pdf'],
    dimensions: [
      { code: 'clausulas' },
      { code: 'pontos_controle' },
    ],
  },
  {
    code: 'amhe-minuta-contrato-coletivo-empresarial',
    title: 'AMHE — Minuta contrato coletivo empresarial',
    sourceKind: 'associacao',
    sourceUrl:
      'https://amhemed.com.br/wp-content/uploads/2026/03/MINUTA-CONTRATO-COLETIVO-EMPRESARIAL-489.29621-8-AMHE-400-EMPRESARIAL.pdf',
    publisher: 'AMHE',
    summary: 'Minuta pública de contrato coletivo empresarial.',
    tags: ['associacao', 'coletivo', 'minuta'],
    dimensions: [
      { code: 'tipos_prestacao' },
      { code: 'previsibilidade' },
      { code: 'acordabilidade' },
    ],
  },
  {
    code: 'hospital-maria-lucinda-contrato-medicos',
    title: 'Hospital Maria Lucinda — Contrato médicos (PDF público)',
    sourceKind: 'hospital',
    sourceUrl:
      'https://www.hospitalmarialucinda.org/files/pdf/maria-vitoria-cavalcanti-barbosa-pessoa-de-melo-medicos-ltda-16_23_7-4209752880-maria-vitoria-cavalcanti-barbosa-pessoa-de-melo-medicos-ltda.pdf',
    publisher: 'Hospital Maria Lucinda',
    summary: 'Peça pública hospitalar — referência de prestação médica.',
    tags: ['hospital', 'prestacao', 'pdf'],
    dimensions: [
      { code: 'tipos_prestacao' },
      { code: 'elementos_controle' },
      { code: 'plausabilidade' },
    ],
  },
  {
    code: 'lesbrasil-minuta-rn71-consultorio',
    title: 'LES Brasil — Minuta PF/PJ em consultório (RN 71)',
    sourceKind: 'outro',
    sourceUrl:
      'http://www.lesbrasil.com.br/prestador/downloads/minuta_pf_ou_pj_em_consultorio_rn71.pdf',
    publisher: 'LES Brasil',
    summary: 'Minuta de consultório alinhada a RN 71 — referência externa.',
    tags: ['rn71', 'consultorio', 'minuta'],
    dimensions: [
      { code: 'adequacao' },
      { code: 'clausulas' },
      { code: 'tipos_prestacao' },
    ],
  },
  // --- Caso-base Unimed–Oncoradium (PDFs locais) ---
  {
    code: 'unimed-oncoradium-aditivo-rn510-2024-02',
    title: 'Unimed–Oncoradium — Aditivo fev/2024 (RN510)',
    sourceKind: 'caso_base',
    localPath:
      'contracts/unimed-oncoradium/pdfs/DOCUMENTO2024-02-23 (2).pdf',
    publisher: 'Unimed / Oncoradium (caso-base)',
    summary:
      'Aditivo de fevereiro/2024 com alinhamentos RN510 e correlatos — corpus primário.',
    tags: ['unimed', 'oncoradium', 'aditivo', 'rn510', 'docType:aditivo'],
    documentType: 'aditivo',
    dimensions: [
      { code: 'adequacao', notes: 'RN510' },
      { code: 'clausulas' },
      { code: 'elementos_controle' },
      { code: 'tipos_manutencao' },
      { code: 'pontos_verificacao' },
    ],
  },
  {
    code: 'unimed-oncoradium-consulta-2024-07-11',
    title: 'Unimed–Oncoradium — Peça consulta (11/07/2024)',
    sourceKind: 'caso_base',
    localPath:
      'contracts/unimed-oncoradium/pdfs/Unimed2024-07-11-consulta.pdf',
    publisher: 'Unimed / Oncoradium (caso-base)',
    summary:
      'Documento Unimed de jul/2024 sobre consulta — corpus primário.',
    tags: ['unimed', 'oncoradium', 'consulta', 'docType:carta'],
    documentType: 'carta',
    dimensions: [
      { code: 'sinalizacao' },
      { code: 'elementos_alerta' },
      { code: 'clausulas' },
      { code: 'monitoramento' },
    ],
  },
  {
    code: 'unimed-oncoradium-aditivo-exclui-consulta-eletiva',
    title: 'Unimed–Oncoradium — Aditivo exclusão consulta eletiva',
    sourceKind: 'caso_base',
    localPath:
      'contracts/unimed-oncoradium/pdfs/aditivo unimed - sobre consulta - enviado a diretoria.pdf',
    publisher: 'Unimed / Oncoradium (caso-base)',
    summary:
      'Aditivo que exclui consulta eletiva — enviado à diretoria; corpus primário.',
    tags: [
      'unimed',
      'oncoradium',
      'aditivo',
      'consulta_eletiva',
      'docType:aditivo',
    ],
    documentType: 'aditivo',
    dimensions: [
      { code: 'clausulas' },
      { code: 'elementos_controle' },
      { code: 'elementos_alerta' },
      { code: 'previsibilidade' },
      { code: 'pontos_controle' },
    ],
  },
  {
    code: 'unimed-oncoradium-comunicado-suspensao-consulta',
    title: 'Unimed–Oncoradium — Comunicado suspensão consulta eletiva',
    sourceKind: 'caso_base',
    localPath:
      'contracts/unimed-oncoradium/pdfs/Comunicado_unimed_suspensao_consulta_eletiva_-_para_assinar_assinado.pdf',
    publisher: 'Unimed / Oncoradium (caso-base)',
    summary:
      'Comunicado assinado de suspensão de consulta eletiva — corpus primário.',
    tags: [
      'unimed',
      'oncoradium',
      'comunicado',
      'consulta_eletiva',
      'docType:comunicado',
    ],
    documentType: 'comunicado',
    dimensions: [
      { code: 'sinalizacao' },
      { code: 'elementos_alerta' },
      { code: 'acordabilidade' },
      { code: 'monitoramento' },
    ],
  },
  {
    code: 'unimed-oncoradium-aditivo-taxas-sala-2024-08',
    title: 'Unimed–Oncoradium — Aditivo taxas de sala (ago/2024)',
    sourceKind: 'caso_base',
    localPath:
      'contracts/unimed-oncoradium/pdfs/termo aditivo ao contrato  unimed - doc recebido em 06.08.2024.pdf',
    publisher: 'Unimed / Oncoradium (caso-base)',
    summary:
      'Termo aditivo recebido em 06.08.2024 — taxas de sala quimioterapia; corpus primário.',
    tags: [
      'unimed',
      'oncoradium',
      'aditivo',
      'taxas_sala',
      'docType:aditivo',
    ],
    documentType: 'aditivo',
    dimensions: [
      { code: 'clausulas' },
      { code: 'elementos_controle' },
      { code: 'tipos_manutencao' },
      { code: 'previsibilidade' },
      { code: 'plausabilidade' },
      { code: 'pontos_controle' },
    ],
  },
];

/** Fixture paths for Unimed PDF import (filename on disk). */
export function unimedPdfSeeds(): Array<{
  code: string;
  fileName: string;
  documentType: DocumentType;
  title: string;
}> {
  return CATALOG_INSTRUMENTS.filter((i) => i.sourceKind === 'caso_base').map(
    (i) => ({
      code: i.code,
      fileName: i.localPath!.replace(/^contracts\/unimed-oncoradium\/pdfs\//, ''),
      documentType: i.documentType ?? ('aditivo' as DocumentType),
      title: i.title,
    }),
  );
}

export async function seedCatalog(prisma: PrismaClient): Promise<{
  dimensions: number;
  instruments: number;
}> {
  for (const dim of CATALOG_DIMENSIONS) {
    await prisma.catalogDimension.upsert({
      where: { code: dim.code },
      create: {
        code: dim.code,
        name: dim.name,
        description: dim.description,
      },
      update: {
        name: dim.name,
        description: dim.description,
      },
    });
  }

  const dimRows = await prisma.catalogDimension.findMany({
    select: { id: true, code: true },
  });
  const dimIdByCode = new Map(dimRows.map((d) => [d.code, d.id]));

  for (const inst of CATALOG_INSTRUMENTS) {
    const row = await prisma.catalogInstrument.upsert({
      where: { code: inst.code },
      create: {
        code: inst.code,
        title: inst.title,
        sourceKind: inst.sourceKind,
        sourceUrl: inst.sourceUrl ?? null,
        localPath: inst.localPath ?? null,
        publisher: inst.publisher ?? null,
        summary: inst.summary ?? null,
        tags: inst.tags ?? [],
      },
      update: {
        title: inst.title,
        sourceKind: inst.sourceKind,
        sourceUrl: inst.sourceUrl ?? null,
        localPath: inst.localPath ?? null,
        publisher: inst.publisher ?? null,
        summary: inst.summary ?? null,
        tags: inst.tags ?? [],
      },
    });

    for (const link of inst.dimensions) {
      const dimensionId = dimIdByCode.get(link.code);
      if (!dimensionId) continue;
      await prisma.catalogInstrumentDimension.upsert({
        where: {
          instrumentId_dimensionId: {
            instrumentId: row.id,
            dimensionId,
          },
        },
        create: {
          instrumentId: row.id,
          dimensionId,
          notes: link.notes ?? null,
        },
        update: {
          notes: link.notes ?? null,
        },
      });
    }
  }

  return {
    dimensions: CATALOG_DIMENSIONS.length,
    instruments: CATALOG_INSTRUMENTS.length,
  };
}
