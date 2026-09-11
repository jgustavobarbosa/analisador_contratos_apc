/** Standard RN510-inspired cadastral checklist (~12 docs). Titles in Portuguese. */
export type Rn510ChecklistTemplate = {
  code: string;
  title: string;
  requiredBy: string;
};

export const RN510_CHECKLIST_TEMPLATES: readonly Rn510ChecklistTemplate[] = [
  {
    code: 'contrato_social',
    title: 'Contrato social ou estatuto social atualizado',
    requiredBy: 'RN510/22',
  },
  {
    code: 'alvara_vigilancia',
    title: 'Alvará da vigilância sanitária',
    requiredBy: 'RN510/22',
  },
  {
    code: 'cnes',
    title: 'Cadastro Nacional de Estabelecimentos de Saúde (CNES)',
    requiredBy: 'RN510/22',
  },
  {
    code: 'pgrss',
    title: 'Plano de Gerenciamento de Resíduos de Serviços de Saúde (PGRSS)',
    requiredBy: 'RN510/22',
  },
  {
    code: 'alvara_funcionamento',
    title: 'Alvará de funcionamento municipal',
    requiredBy: 'RN510/22',
  },
  {
    code: 'corpo_clinico',
    title: 'Documentação do corpo clínico (CRM/especialidades)',
    requiredBy: 'RN510/22',
  },
  {
    code: 'responsavel_tecnico',
    title: 'Comprovante de responsável técnico (CRM)',
    requiredBy: 'RN510/22',
  },
  {
    code: 'certificado_bombeiros',
    title: 'Certificado de vistoria do corpo de bombeiros (AVCB)',
    requiredBy: 'RN510/22',
  },
  {
    code: 'licenca_sanitaria',
    title: 'Licença sanitária do estabelecimento',
    requiredBy: 'RN510/22',
  },
  {
    code: 'comprovante_endereco',
    title: 'Comprovante de endereço do estabelecimento',
    requiredBy: 'RN510/22',
  },
  {
    code: 'certidoes_fiscais',
    title: 'Certidões fiscais e trabalhistas regulares',
    requiredBy: 'RN510/22',
  },
  {
    code: 'apolice_seguro',
    title: 'Apólice de seguro de responsabilidade civil (quando exigida)',
    requiredBy: 'RN510/22',
  },
] as const;
