/* PAINT FORZA — núcleo compartilhado entre site, sistema e portal do cliente.
   Dados ficam no localStorage do navegador (demonstração, sem servidor). */
(function () {
  const KEY = 'paintforza_demo_v2';
  const DAY = 86400000;

  const OFICINA = {
    nome: 'Paint Forza',
    cidade: 'Belém – PA',
    whatsapp: '5591993703928',
    whatsappFmt: '(91) 99370-3928',
    instagram: 'forza.paint',
  };

  // Etapas do carro dentro da oficina, na ordem em que acontecem.
  const STATUS = [
    { id: 'orcamento', label: 'Orçamento', color: '#8E9196', cliente: 'Recebemos seu carro e estamos montando o orçamento.' },
    { id: 'aprovacao', label: 'Aguardando aprovação', color: '#C9A227', texto: '#1f1800',cliente: 'O orçamento está pronto. Falta a sua aprovação para começarmos.' },
    { id: 'funilaria', label: 'Funilaria', color: '#B8652F', cliente: 'Funilaria: estamos recuperando e alinhando a lataria.' },
    { id: 'preparacao', label: 'Preparação', color: '#6F7A84', cliente: 'Preparação: massa, lixamento e primer antes da tinta.' },
    { id: 'pintura', label: 'Pintura', color: '#2F62C9', cliente: 'Pintura em cabine, com a cor conferida antes de aplicar.' },
    { id: 'estetica', label: 'Polimento e estética', color: '#6D4FB8', cliente: 'Polimento, acabamento e estética.' },
    { id: 'pronto', label: 'Pronto para retirada', color: '#23864E', cliente: 'Seu carro está pronto. Pode vir buscar!' },
    { id: 'entregue', label: 'Entregue', color: '#000000', cliente: 'Carro entregue. Obrigado pela confiança!' },
  ];
  const FLUXOS = {
    completo: { label: 'Funilaria e pintura', etapas: ['orcamento', 'aprovacao', 'funilaria', 'preparacao', 'pintura', 'estetica', 'pronto', 'entregue'] },
    pintura: { label: 'Somente pintura', etapas: ['orcamento', 'aprovacao', 'preparacao', 'pintura', 'estetica', 'pronto', 'entregue'] },
    estetica: { label: 'Estética automotiva', etapas: ['orcamento', 'aprovacao', 'estetica', 'pronto', 'entregue'] },
  };

  // Peças do diagrama de vistoria (vista de cima, frente para cima, lado esquerdo = motorista).
  const PECAS = [
    { id: 'pcd', nome: 'Para-choque dianteiro', r: [58, 14, 144, 30, 12] },
    { id: 'capo', nome: 'Capô', r: [58, 48, 144, 96, 8] },
    { id: 'pbr', nome: 'Para-brisa', p: '62,148 198,148 186,192 74,192' },
    { id: 'teto', nome: 'Teto', r: [74, 196, 112, 118, 6] },
    { id: 'vtr', nome: 'Vidro traseiro', p: '74,318 186,318 196,350 64,350' },
    { id: 'tampa', nome: 'Tampa traseira', r: [58, 354, 144, 82, 8] },
    { id: 'pct', nome: 'Para-choque traseiro', r: [58, 440, 144, 30, 12] },
    { id: 'plde', nome: 'Para-lama dianteiro esq.', r: [30, 48, 24, 96, 8] },
    { id: 'pldd', nome: 'Para-lama dianteiro dir.', r: [206, 48, 24, 96, 8] },
    { id: 'pde', nome: 'Porta dianteira esq.', r: [30, 148, 24, 100, 4] },
    { id: 'pdd', nome: 'Porta dianteira dir.', r: [206, 148, 24, 100, 4] },
    { id: 'pte', nome: 'Porta traseira esq.', r: [30, 252, 24, 90, 4] },
    { id: 'ptd', nome: 'Porta traseira dir.', r: [206, 252, 24, 90, 4] },
    { id: 'lte', nome: 'Lateral traseira esq.', r: [30, 346, 24, 90, 8] },
    { id: 'ltd', nome: 'Lateral traseira dir.', r: [206, 346, 24, 90, 8] },
    { id: 'rte', nome: 'Retrovisor esq.', r: [6, 160, 20, 16, 4] },
    { id: 'rtd', nome: 'Retrovisor dir.', r: [234, 160, 20, 16, 4] },
  ];
  const AVARIAS = [
    { id: 'amassado', label: 'Amassado', cor: '#B8652F' },
    { id: 'risco', label: 'Risco', cor: '#C9A227' },
    { id: 'trincado', label: 'Trincado / quebrado', cor: '#C8382E' },
    { id: 'pintura', label: 'Pintura danificada', cor: '#6D4FB8' },
    { id: 'ferrugem', label: 'Ferrugem', cor: '#6B4426' },
  ];
  const ITENS_ENTRADA = ['Estepe', 'Macaco', 'Chave de roda', 'Triângulo', 'Tapetes', 'Documento (CRLV)', 'Chave reserva', 'Manual', 'Multimídia funcionando', 'Calotas / rodas sem avaria', 'Objetos pessoais no carro', 'Luzes de alerta no painel'];
  const CHECK_SAIDA = ['Cor conferida sob luz natural', 'Sem casca de laranja ou escorrido', 'Polimento final sem hologramas', 'Frisos e emblemas recolocados', 'Portas e tampas alinhadas', 'Lavagem final feita', 'Itens pessoais devolvidos', 'Cliente conferiu o carro na entrega'];
  const FORMAS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Transferência', 'Seguradora'];
  const CAT_CUSTO = ['Peças', 'Tintas e materiais', 'Serviço terceirizado', 'Outros'];
  const CAT_DESPESA = ['Aluguel', 'Folha de pagamento', 'Energia', 'Tintas e materiais', 'Impostos', 'Contabilidade', 'Internet e telefone', 'Manutenção de equipamentos', 'Outros'];
  const SEGURADORAS = ['Porto Seguro', 'Azul Seguros', 'Bradesco Seguros', 'Allianz', 'Tokio Marine', 'HDI', 'Mapfre', 'Suhai', 'Outra'];
  const AUTORIZACAO = { aguardando: 'Aguardando autorização', autorizado: 'Autorizado', negado: 'Negado' };
  const CAT_ESTOQUE = ['Tintas e vernizes', 'Primers e massas', 'Abrasivos', 'Polimento e vitrificação', 'Películas e PPF', 'Fitas e mascaramento', 'EPIs', 'Peças'];
  const UNIDADES = ['L', 'kg', 'un', 'cx', 'rolo', 'm', 'pct'];
  const TIPOS_AGENDA = ['Orçamento', 'Entrada de carro', 'Retirada'];
  // A primeira regra que combinar com a descrição vale; por isso as mais específicas vêm antes.
  const GARANTIAS = [
    { chave: 'PPF', meses: 24 }, { chave: 'Vitrificação', meses: 12 }, { chave: 'Película', meses: 24 }, { chave: 'Polimento', meses: 3 },
    { chave: 'Martelinho', meses: 6 }, { chave: 'Reparo', meses: 6 }, { chave: 'Funilaria', meses: 12 }, { chave: 'Pintura', meses: 12 },
  ];
  const EQUIPE = [
    { id: 'e1', nome: 'Diego Souza', funcao: 'Funilaria e chefe de oficina', comissao: 5 },
    { id: 'e2', nome: 'Bruno Costa', funcao: 'Pintura', comissao: 6 },
    { id: 'e3', nome: 'Leandro Melo', funcao: 'Preparação', comissao: 4 },
    { id: 'e4', nome: 'Wesley Pinheiro', funcao: 'Polimento e estética', comissao: 8 },
  ];
  const executorPadrao = (descricao) => {
    const d = descricao.toLowerCase();
    if (/polimento|vitrifica|película|ppf|higieniza|lavagem|faróis|coating/.test(d)) return 'e4';
    if (/prepara|primer|massa/.test(d)) return 'e3';
    if (/pintura|degradê/.test(d)) return 'e2';
    if (/funilaria|martelinho|reparo|ferrugem/.test(d)) return 'e1';
    return null;
  };

  const CATALOGO = [
    { id: 's1', nome: 'Funilaria por peça', tipo: 'servico', valor: 450 },
    { id: 's2', nome: 'Pintura por peça', tipo: 'servico', valor: 700 },
    { id: 's3', nome: 'Reparo de para-choque', tipo: 'servico', valor: 380 },
    { id: 's4', nome: 'Martelinho de ouro', tipo: 'servico', valor: 250 },
    { id: 's5', nome: 'Pintura completa', tipo: 'servico', valor: 9500 },
    { id: 's6', nome: 'Polimento técnico', tipo: 'servico', valor: 650 },
    { id: 's7', nome: 'Vitrificação de pintura', tipo: 'servico', valor: 1800 },
    { id: 's8', nome: 'Película (insulfilm) completa', tipo: 'servico', valor: 900 },
    { id: 's9', nome: 'Higienização interna', tipo: 'servico', valor: 350 },
    { id: 's10', nome: 'Restauração de faróis', tipo: 'servico', valor: 220 },
    { id: 's11', nome: 'Lavagem detalhada', tipo: 'servico', valor: 150 },
  ];

  // ---------- utilitários ----------
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmt = {
    money: (v) => money.format(v || 0),
    date: (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—',
    dateShort: (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '—',
    dateTime: (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    pct: (v) => (isFinite(v) ? Math.round(v * 100) : 0) + '%',
    month: (d) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const isoDay = (offset, hour = 9) => { const d = today0(); d.setDate(d.getDate() + offset); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
  const toInputDate = (iso) => iso ? new Date(iso).toISOString().slice(0, 10) : '';
  const fromInputDate = (v) => v ? new Date(v + 'T12:00:00').toISOString() : null;

  // ---------- desenhos ----------
  // Silhueta lateral de um sedã (frente à esquerda). Usada no site e nas fotos de exemplo.
  const CAR_BODY = 'M70,268 L60,240 Q58,214 82,205 L200,186 Q262,176 330,171 C384,140 432,108 486,100 L640,98 Q690,100 722,121 C762,150 792,168 832,175 L915,182 Q946,187 948,212 L950,250 Q948,268 930,270 L842,270 A72,72 0 0 0 698,270 L302,270 A72,72 0 0 0 158,270 Z';
  const CAR_GLASS = 'M352,170 C398,140 442,116 490,110 L560,108 L560,168 Z M572,108 L634,108 Q676,110 700,130 L728,166 L572,168 Z';

  function carPhoto(cor, legenda) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9dcdf"/><stop offset="1" stop-color="#a9adb1"/></linearGradient><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="1000" height="620" fill="url(#g)"/><ellipse cx="505" cy="440" rx="440" ry="26" fill="#000" opacity=".25"/><g transform="translate(0,140)"><path d="${CAR_BODY}" fill="${cor}" stroke="#000" stroke-width="3"/><path d="${CAR_BODY}" fill="url(#b)"/><path d="${CAR_GLASS}" fill="#1d2329"/><circle cx="230" cy="270" r="56" fill="#141414"/><circle cx="230" cy="270" r="30" fill="#9a9fa4"/><circle cx="770" cy="270" r="56" fill="#141414"/><circle cx="770" cy="270" r="30" fill="#9a9fa4"/></g><rect x="24" y="560" width="${Math.max(140, legenda.length * 15 + 30)}" height="40" fill="#000"/><text x="40" y="588" font-family="Arial, sans-serif" font-size="22" fill="#fff">${esc(legenda)}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function diagramSVG(avarias, opts = {}) {
    const by = {};
    (avarias || []).forEach((a) => { (by[a.peca] = by[a.peca] || []).push(a); });
    const shapes = PECAS.map((p) => {
      const list = by[p.id];
      const fill = list ? (AVARIAS.find((t) => t.id === list[list.length - 1].tipo) || {}).cor : '#fff';
      const attrs = `data-peca="${p.id}" class="peca${list ? ' tem' : ''}" fill="${fill}" stroke="#000" stroke-width="2"${opts.interactive ? ' tabindex="0" role="button"' : ''}`;
      const title = `<title>${esc(p.nome)}${list ? ': ' + list.map((a) => labelAvaria(a.tipo)).join(', ') : ''}</title>`;
      return p.r
        ? `<rect x="${p.r[0]}" y="${p.r[1]}" width="${p.r[2]}" height="${p.r[3]}" rx="${p.r[4]}" ${attrs}>${title}</rect>`
        : `<polygon points="${p.p}" ${attrs}>${title}</polygon>`;
    }).join('');
    return `<svg class="diagrama${opts.interactive ? ' is-interactive' : ''}" viewBox="0 0 260 490" aria-label="Diagrama de avarias do veículo"><text x="130" y="486" text-anchor="middle" font-size="11" font-family="Barlow Condensed, sans-serif" fill="#5E646A">traseira</text>${shapes}<text x="130" y="10" text-anchor="middle" font-size="11" font-family="Barlow Condensed, sans-serif" fill="#5E646A">frente</text></svg>`;
  }
  const labelAvaria = (id) => (AVARIAS.find((a) => a.id === id) || {}).label || id;
  const nomePeca = (id) => (PECAS.find((p) => p.id === id) || {}).nome || id;

  function plate(placa, size = '') {
    return `<span class="placa ${size}"><span class="placa__faixa">BRASIL</span><span class="placa__num">${esc(placa)}</span></span>`;
  }
  const statusOf = (id) => STATUS.find((s) => s.id === id) || STATUS[0];
  const chip = (id) => { const s = statusOf(id); return `<span class="chip" style="--c:${s.color}">${esc(s.label)}</span>`; };

  // ---------- cálculos financeiros ----------
  const aprovada = (os) => !['orcamento', 'aprovacao'].includes(os.status);
  const itemAtivo = (i) => i.status !== 'recusado';
  const temSeguradora = (os) => os.origem === 'Seguradora' && !!os.seguradora;
  function totais(os) {
    const itens = os.itens || [];
    const bruto = itens.filter(itemAtivo).reduce((s, i) => s + i.qtd * i.valor, 0);
    const recusado = itens.filter((i) => !itemAtivo(i)).reduce((s, i) => s + i.qtd * i.valor, 0);
    const total = Math.max(0, bruto - (os.desconto || 0));
    const pagos = os.pagamentos || [];
    const pago = pagos.reduce((s, p) => s + p.valor, 0);
    const pagoSeguradora = pagos.filter((p) => p.forma === 'Seguradora').reduce((s, p) => s + p.valor, 0);
    const pagoCliente = pago - pagoSeguradora;
    const custo = (os.custos || []).reduce((s, c) => s + c.valor, 0);
    // Com seguradora, o cliente paga a franquia e a seguradora paga o restante.
    const parteCliente = temSeguradora(os) ? Math.min(total, os.seguradora.franquia || 0) : total;
    const parteSeguradora = total - parteCliente;
    const ok = aprovada(os);
    const saldoCliente = ok ? Math.max(0, parteCliente - pagoCliente) : 0;
    const saldoSeguradora = ok ? Math.max(0, parteSeguradora - pagoSeguradora) : 0;
    const saldo = ok ? Math.max(0, total - pago) : 0;
    return { bruto, recusado, total, pago, pagoCliente, pagoSeguradora, parteCliente, parteSeguradora, saldoCliente, saldoSeguradora, custo, saldo, margem: total - custo, margemPct: total ? (total - custo) / total : 0 };
  }

  // Valor por extenso, para recibos.
  const UNID = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  function ate999(n) {
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100), r = n % 100, p = [];
    if (c) p.push(CEM[c]);
    if (r) p.push(r < 20 ? UNID[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UNID[r % 10] : ''));
    return p.join(' e ');
  }
  function inteiroExtenso(n) {
    if (!n) return 'zero';
    const mi = Math.floor(n / 1e6), mil = Math.floor((n % 1e6) / 1000), r = n % 1000, p = [];
    if (mi) p.push(mi === 1 ? 'um milhão' : ate999(mi) + ' milhões');
    if (mil) p.push(mil === 1 ? 'mil' : ate999(mil) + ' mil');
    if (r) p.push((p.length && (r < 100 || r % 100 === 0) ? 'e ' : '') + ate999(r));
    return p.join(' ');
  }
  function extenso(valor) {
    const cents = Math.round((valor || 0) * 100), reais = Math.floor(cents / 100), cent = cents % 100;
    const partes = [];
    if (reais) partes.push(`${inteiroExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`);
    if (cent) partes.push(`${inteiroExtenso(cent)} ${cent === 1 ? 'centavo' : 'centavos'}`);
    return partes.join(' e ') || 'zero real';
  }
  const garantiaDe = (descricao, regras) => (regras || GARANTIAS).find((g) => descricao.toLowerCase().includes(g.chave.toLowerCase())) || null;

  // ---------- dados de demonstração ----------
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function seed() {
    const R = rng(1042);
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const db = { oficina: { ...OFICINA, endereco: 'Endereço da oficina, Belém – PA', horario: 'Seg a sex, 8h às 18h, sáb 8h às 12h' }, catalogo: CATALOGO.map((c) => ({ ...c })), garantias: GARANTIAS.map((g) => ({ ...g })), equipe: EQUIPE.map((e) => ({ ...e })), clientes: [], veiculos: [], os: [], despesas: [], estoque: [], movEstoque: [], agenda: [], seq: 1045 };

    const C = (nome, telefone, email, tipo = 'PF') => { const c = { id: uid(), nome, telefone, email, tipo, criadoEm: isoDay(-200) }; db.clientes.push(c); return c; };
    const V = (cli, placa, marca, modelo, ano, cor, corHex) => { const v = { id: uid(), clienteId: cli.id, placa, marca, modelo, ano, cor, corHex }; db.veiculos.push(v); return v; };

    const ana = C('Ana Beatriz Monteiro', '(91) 98112-4471', 'ana.monteiro@email.com');
    const rafael = C('Rafael Nogueira', '(91) 99245-1830', 'rafael.nog@email.com');
    const marcos = C('Marcos Vinícius Lobato', '(91) 98420-7765', 'marcos.lobato@email.com');
    const juliana = C('Juliana Farias', '(91) 98877-3012', 'ju.farias@email.com');
    const henrique = C('Henrique Sarmento', '(91) 99133-0908', 'h.sarmento@email.com');
    const guama = C('Transportes Guamá Ltda.', '(91) 3241-5590', 'frota@transguama.com.br', 'PJ');
    const larissa = C('Larissa Pantoja', '(91) 98301-6624', 'larissa.pantoja@email.com');
    const eduardo = C('Eduardo Maia', '(91) 99610-2287', 'eduardo.maia@email.com');
    const patricia = C('Patrícia Leão', '(91) 98155-9043', 'patricia.leao@email.com');
    const extras = [
      C('Carlos Henrique Batista', '(91) 98544-2101', 'carlos.batista@email.com'),
      C('Fernanda Quaresma', '(91) 99312-7756', 'fe.quaresma@email.com'),
      C('Thiago Corrêa', '(91) 98023-4418', 'thiago.correa@email.com'),
      C('Beatriz Tavares', '(91) 98760-1193', 'bia.tavares@email.com'),
    ];

    const vAna = V(ana, 'QEX4F21', 'Jeep', 'Compass Longitude', 2022, 'Branco Polar', '#ECEDEE');
    const vRafael = V(rafael, 'RPA2B57', 'Toyota', 'Corolla XEi', 2021, 'Prata Supernova', '#B9BEC3');
    const vMarcos = V(marcos, 'QDJ7H88', 'Honda', 'Civic Touring', 2020, 'Preto Cristal', '#16181B');
    const vJuliana = V(juliana, 'SAF3C09', 'Volkswagen', 'Nivus Highline', 2023, 'Cinza Moonstone', '#7D8186');
    const vHenrique = V(henrique, 'RXT9E14', 'BMW', '320i M Sport', 2022, 'Azul Portimão', '#1F4FA8');
    const vToro = V(guama, 'SBM1A44', 'Fiat', 'Toro Ranch', 2023, 'Vermelho Montecarlo', '#9E1B1F');
    const vL200 = V(guama, 'QEJ5D72', 'Mitsubishi', 'L200 Triton Sport', 2021, 'Branco Alpine', '#F1F1EF');
    const vLarissa = V(larissa, 'PZK6G31', 'Hyundai', 'HB20 Comfort', 2019, 'Branco Atlas', '#F2F2F0');
    const vEduardo = V(eduardo, 'SCH8B26', 'Toyota', 'Hilux SRX', 2024, 'Preto Attitude', '#0F1012');
    const vPatricia = V(patricia, 'RTV4J60', 'Chevrolet', 'Onix Premier', 2022, 'Vermelho Carmim', '#A3161E');
    const vExtras = [
      V(extras[0], 'QDP2F15', 'Renault', 'Duster Iconic', 2021, 'Laranja Ouro', '#C4621B'),
      V(extras[1], 'RNE8C40', 'Nissan', 'Kicks Exclusive', 2022, 'Cinza Grafite', '#4B4F54'),
      V(extras[2], 'SAA1H93', 'Volkswagen', 'T-Cross Comfortline', 2023, 'Azul Biscay', '#244C7C'),
      V(extras[3], 'PZT3E77', 'Fiat', 'Pulse Impetus', 2023, 'Branco Banchisa', '#F0F0EE'),
    ];

    const it = (descricao, valor, tipo = 'servico', qtd = 1, status = 'aprovado') => ({ id: uid(), tipo, descricao, qtd, valor, status, executorId: tipo === 'servico' ? executorPadrao(descricao) : null });
    const pg = (dia, valor, forma, obs = '') => ({ id: uid(), data: isoDay(dia, 14), valor, forma, obs });
    const cu = (dia, descricao, valor, categoria) => ({ id: uid(), data: isoDay(dia, 11), descricao, valor, categoria });
    const fullChecks = (lista, exceto = []) => Object.fromEntries(lista.map((i) => [i, !exceto.includes(i)]));

    function O(o) {
      const etapas = FLUXOS[o.fluxo || 'completo'].etapas;
      const idx = etapas.indexOf(o.status);
      const hist = [];
      const start = o.abertura;
      etapas.slice(0, idx + 1).forEach((st, i) => {
        hist.push({ id: uid(), data: isoDay(start + Math.round((i * (o.diasAteAgora || 1)) / Math.max(1, idx)), 9 + i), status: st, nota: i === 0 ? 'Carro recebido e vistoria de entrada feita.' : '' });
      });
      const os = {
        id: uid(), numero: o.numero, codigo: o.codigo, veiculoId: o.v.id, clienteId: o.v.clienteId,
        fluxo: o.fluxo || 'completo', status: o.status, abertura: isoDay(start), previsao: isoDay(o.previsao), entrega: o.entrega != null ? isoDay(o.entrega, 16) : null,
        responsavel: o.responsavel || 'Diego (chefe de oficina)', origem: o.origem || 'Particular', sinistro: o.sinistro || '', seguradora: o.seguradora || null, relato: o.relato, fotosEtapas: o.fotosEtapas || [],
        entrada: { km: o.km, combustivel: o.comb ?? 4, itens: fullChecks(ITENS_ENTRADA, o.semItens || ['Objetos pessoais no carro', 'Luzes de alerta no painel', 'Manual']), avarias: o.avarias || [], fotos: o.fotos || [carPhoto(o.v.corHex, 'Entrada · ' + o.v.placa)], obs: o.obsEntrada || '', assinatura: null, data: isoDay(start, 9) },
        itens: o.itens, desconto: o.desconto || 0, pagamentos: o.pagamentos || [], custos: o.custos || [],
        saida: { km: o.kmSaida || null, checklist: o.status === 'pronto' || o.status === 'entregue' ? fullChecks(CHECK_SAIDA, o.status === 'pronto' ? ['Itens pessoais devolvidos', 'Cliente conferiu o carro na entrega'] : []) : {}, fotos: o.status === 'pronto' || o.status === 'entregue' ? [carPhoto(o.v.corHex, 'Saída · ' + o.v.placa)] : [], obs: '', assinatura: null, data: o.entrega != null ? isoDay(o.entrega, 16) : null },
        aprovadoEm: idx >= 2 ? isoDay(start + 1, 15) : null,
        historico: hist.reverse(),
      };
      if (o.notas) o.notas.forEach((n) => os.historico.unshift({ id: uid(), data: isoDay(n[0], n[1] || 10), status: null, nota: n[2], publica: true }));
      db.os.push(os);
      return os;
    }

    O({ numero: 1044, codigo: 'QX4F', v: vAna, status: 'orcamento', abertura: 0, previsao: 6, km: 38214, comb: 5,
      relato: 'Bateu de ré no estacionamento do shopping. Para-choque traseiro trincou e a tampa amassou perto da placa.',
      avarias: [{ peca: 'pct', tipo: 'trincado', obs: 'Trinca de 18 cm no canto esquerdo' }, { peca: 'tampa', tipo: 'amassado', obs: 'Amassado acima da placa' }, { peca: 'lte', tipo: 'risco', obs: 'Risco superficial' }],
      itens: [it('Funilaria da tampa traseira', 650), it('Para-choque traseiro original', 1890, 'peca'), it('Pintura de para-choque e tampa', 1400), it('Polimento de nivelamento da lateral', 280)] });

    O({ numero: 1043, codigo: 'RP2B', v: vRafael, status: 'aprovacao', abertura: -2, previsao: 8, km: 61530, comb: 3, origem: 'Seguradora', sinistro: '2026.118734', seguradora: { nome: 'Porto Seguro', franquia: 2100, autorizacao: 'aguardando', valorAutorizado: null }, diasAteAgora: 1,
      relato: 'Colisão lateral no cruzamento. Porta dianteira direita afundada e retrovisor quebrado. Sinistro aberto na seguradora.',
      avarias: [{ peca: 'pdd', tipo: 'amassado', obs: 'Afundamento de 30 cm' }, { peca: 'ptd', tipo: 'amassado', obs: 'Vinco na borda' }, { peca: 'rtd', tipo: 'trincado', obs: 'Carcaça e lente quebradas' }],
      itens: [it('Funilaria da porta dianteira dir.', 900), it('Funilaria da porta traseira dir.', 450), it('Retrovisor elétrico dir. completo', 1350, 'peca'), it('Pintura de 2 portas', 1400), it('Polimento de nivelamento', 280)],
      notas: [[-1, 15, 'Orçamento enviado para a seguradora e para o cliente.']] });

    O({ numero: 1042, codigo: 'FZ7K', v: vMarcos, status: 'pintura', abertura: -6, previsao: 2, km: 74102, comb: 4, diasAteAgora: 5,
      fotosEtapas: [
        { id: uid(), etapa: 'funilaria', data: isoDay(-4, 15), src: carPhoto('#8f959b', 'Funilaria · QDJ7H88') },
        { id: uid(), etapa: 'preparacao', data: isoDay(-3, 11), src: carPhoto('#C9CDD1', 'Primer · QDJ7H88') },
        { id: uid(), etapa: 'pintura', data: isoDay(-1, 16), src: carPhoto('#16181B', 'Cabine · QDJ7H88') },
      ],
      relato: 'Capô e para-choque dianteiro com pintura descascando e pedrisco. Quer deixar o carro com cara de novo.',
      avarias: [{ peca: 'capo', tipo: 'pintura', obs: 'Verniz queimado e descascando' }, { peca: 'pcd', tipo: 'risco', obs: 'Pedrisco e riscos' }, { peca: 'plde', tipo: 'amassado', obs: 'Pequeno amassado' }],
      itens: [it('Pintura do capô', 900), it('Pintura do para-choque dianteiro', 700), it('Martelinho de ouro no para-lama esq.', 250), it('Polimento técnico completo', 650), it('Vitrificação de pintura', 1800)], desconto: 200,
      pagamentos: [pg(-5, 2050, 'Pix', 'Entrada de 50%')],
      custos: [cu(-4, 'Tinta Preto Cristal base + verniz HS', 620, 'Tintas e materiais'), cu(-4, 'Abrasivos e massa poliéster', 145, 'Tintas e materiais')],
      notas: [[-1, 16, 'Capô e para-choque na cabine. Cor aprovada no teste de tonalidade.']] });

    O({ numero: 1041, codigo: 'NV3C', v: vJuliana, status: 'funilaria', abertura: -4, previsao: 5, km: 22860, comb: 6, diasAteAgora: 3,
      relato: 'Batida na frente. Para-choque solto e farol esquerdo trincado.',
      avarias: [{ peca: 'pcd', tipo: 'trincado', obs: 'Fixações quebradas' }, { peca: 'capo', tipo: 'amassado', obs: 'Amassado na borda' }, { peca: 'plde', tipo: 'amassado', obs: '' }],
      itens: [it('Reparo do para-choque dianteiro', 380), it('Funilaria do capô', 450), it('Funilaria do para-lama esq.', 450), it('Farol esquerdo full LED', 2480, 'peca'), it('Pintura de 3 peças', 2100)],
      pagamentos: [pg(-3, 2930, 'Cartão de crédito', '3x sem juros')],
      custos: [cu(-3, 'Farol esquerdo full LED (fornecedor)', 1890, 'Peças')] });

    O({ numero: 1040, codigo: 'BM9E', v: vHenrique, status: 'estetica', fluxo: 'estetica', abertura: -3, previsao: 1, km: 18430, comb: 7, diasAteAgora: 2,
      relato: 'Quer proteger a pintura: polimento, vitrificação e película nos vidros.',
      avarias: [{ peca: 'pdd', tipo: 'risco', obs: 'Marcas de lavagem (swirls)' }],
      itens: [it('Polimento técnico em 3 etapas', 950), it('Vitrificação de pintura 9H', 1800), it('Película nano cerâmica completa', 1600), it('Higienização interna', 350, 'servico', 1, 'recusado')],
      pagamentos: [pg(-3, 2350, 'Pix', 'Sinal de 50%')],
      custos: [cu(-2, 'Película nano cerâmica (rolo)', 520, 'Tintas e materiais'), cu(-2, 'Coating 9H', 380, 'Tintas e materiais')] });

    O({ numero: 1039, codigo: 'TR1A', v: vToro, status: 'preparacao', abertura: -5, previsao: 3, km: 88910, comb: 2, diasAteAgora: 4,
      relato: 'Caçamba e tampa traseira raladas no uso da frota. Pintura da tampa e da lateral direita.',
      avarias: [{ peca: 'tampa', tipo: 'risco', obs: 'Ralado profundo' }, { peca: 'ltd', tipo: 'amassado', obs: '' }, { peca: 'ltd', tipo: 'ferrugem', obs: 'Início de ferrugem na caixa de roda' }],
      itens: [it('Funilaria da lateral traseira dir.', 650), it('Tratamento de ferrugem', 320), it('Pintura de tampa e lateral', 1400)],
      custos: [cu(-3, 'Tinta Vermelho Montecarlo', 410, 'Tintas e materiais')], obsEntrada: 'Frota: faturar para a empresa com boleto 28 dias.' });

    O({ numero: 1038, codigo: 'HB6G', v: vLarissa, status: 'pronto', abertura: -8, previsao: 0, km: 97320, comb: 3, diasAteAgora: 7, kmSaida: 97326,
      relato: 'Para-choque traseiro arranhado e lanterna esquerda quebrada.',
      avarias: [{ peca: 'pct', tipo: 'risco', obs: '' }, { peca: 'lte', tipo: 'trincado', obs: 'Lanterna quebrada' }],
      itens: [it('Reparo do para-choque traseiro', 380), it('Lanterna traseira esq.', 420, 'peca'), it('Pintura do para-choque', 700), it('Lavagem detalhada', 150)],
      pagamentos: [pg(-8, 600, 'Dinheiro', 'Entrada')],
      custos: [cu(-6, 'Lanterna traseira esq.', 260, 'Peças'), cu(-4, 'Tinta Branco Atlas + verniz', 230, 'Tintas e materiais')],
      notas: [[0, 8, 'Avisamos a cliente pelo WhatsApp que o carro está pronto.']] });

    O({ numero: 1037, codigo: 'HX8B', v: vEduardo, status: 'pronto', fluxo: 'estetica', abertura: -4, previsao: 0, km: 9120, comb: 8, diasAteAgora: 3, kmSaida: 9122,
      relato: 'Carro novo. Vitrificação, película e PPF no capô.',
      itens: [it('Polimento de correção leve', 650), it('Vitrificação de pintura 9H', 1800), it('Película nano cerâmica completa', 1600), it('PPF no capô e para-choque', 3200)],
      pagamentos: [pg(-4, 3625, 'Pix', 'Entrada'), pg(-1, 3625, 'Cartão de débito', 'Restante')],
      custos: [cu(-3, 'Filme PPF (metro)', 1450, 'Tintas e materiais'), cu(-3, 'Película e coating', 900, 'Tintas e materiais')] });

    O({ numero: 1036, codigo: 'ON4J', v: vPatricia, status: 'funilaria', abertura: -2, previsao: 7, km: 41285, comb: 4, diasAteAgora: 1, origem: 'Seguradora', sinistro: '2026.120551', seguradora: { nome: 'Azul Seguros', franquia: 1200, autorizacao: 'autorizado', valorAutorizado: 1060 },
      relato: 'Porta do motorista amassada por outro carro no estacionamento.',
      avarias: [{ peca: 'pde', tipo: 'amassado', obs: 'Amassado com vinco' }, { peca: 'pde', tipo: 'pintura', obs: 'Tinta trincada' }],
      itens: [it('Funilaria da porta dianteira esq.', 600), it('Pintura da porta e degradê no para-lama', 1100), it('Maçaneta externa esq.', 280, 'peca'), it('Polimento de nivelamento', 280)],
      pagamentos: [pg(-2, 850, 'Pix', 'Sinal')] });

    O({ numero: 1035, codigo: 'LT5D', v: vL200, status: 'entregue', abertura: -14, previsao: -4, entrega: -3, km: 132400, comb: 3, diasAteAgora: 11, kmSaida: 132409,
      relato: 'Para-choque dianteiro e grade danificados (frota).',
      avarias: [{ peca: 'pcd', tipo: 'trincado', obs: '' }],
      itens: [it('Para-choque dianteiro', 1650, 'peca'), it('Grade frontal', 780, 'peca'), it('Pintura do para-choque', 700)],
      pagamentos: [pg(-3, 1500, 'Boleto', 'Boleto 1/2')],
      custos: [cu(-10, 'Para-choque + grade (fornecedor)', 1720, 'Peças'), cu(-6, 'Tinta Branco Alpine', 190, 'Tintas e materiais')],
      obsEntrada: 'Frota: boleto em 2 parcelas.' });

    // Histórico: carros já entregues nos últimos meses, para o financeiro ter volume.
    const historicos = [vExtras[0], vExtras[1], vExtras[2], vExtras[3], vMarcos, vHenrique, vToro, vL200, vRafael, vAna, vEduardo, vJuliana];
    const pacotes = [
      [['Funilaria por peça', 450], ['Pintura por peça', 700]],
      [['Polimento técnico', 650], ['Vitrificação de pintura', 1800]],
      [['Reparo de para-choque', 380], ['Pintura por peça', 700], ['Lavagem detalhada', 150]],
      [['Película (insulfilm) completa', 900], ['Higienização interna', 350]],
      [['Pintura completa', 9500], ['Polimento técnico', 650]],
      [['Martelinho de ouro', 250], ['Restauração de faróis', 220]],
      [['Funilaria por peça', 450], ['Funilaria por peça', 450], ['Pintura por peça', 1400], ['Polimento técnico', 650]],
    ];
    let numero = 1034;
    for (let i = 0; i < 64; i++) {
      const v = historicos[i % historicos.length];
      const ab = -(4 + Math.floor((i / 64) * 172 + R() * 6));
      const dur = Math.min(-ab - 1, 3 + Math.floor(R() * 8));
      const pac = i % 9 === 4 ? pacotes[4] : pick(pacotes);
      const itens = pac.map(([n, val]) => it(n, Math.round((val * (1.1 + R() * 0.6)) / 10) * 10));
      if (R() < 0.45) itens.push(it(pick(['Para-choque dianteiro', 'Farol', 'Lanterna traseira', 'Retrovisor completo', 'Grade frontal']), Math.round((500 + R() * 1800) / 10) * 10, 'peca'));
      const total = itens.reduce((s, x) => s + x.valor, 0);
      const pags = R() < 0.5 ? [pg(ab, total, pick(['Pix', 'Cartão de crédito', 'Dinheiro', 'Cartão de débito']))] : [pg(ab, Math.round(total / 2), 'Pix', 'Entrada'), pg(ab + dur, total - Math.round(total / 2), pick(['Pix', 'Cartão de crédito']), 'Restante')];
      const custos = [cu(ab + 1, 'Materiais e insumos', Math.round(total * (0.22 + R() * 0.18)), 'Tintas e materiais')];
      O({ numero: numero--, codigo: Math.random().toString(36).slice(2, 6).toUpperCase(), v, status: 'entregue', fluxo: pac[0][0].includes('Polimento') || pac[0][0].includes('Película') ? 'estetica' : 'completo', abertura: ab, previsao: ab + dur, entrega: ab + dur, km: 20000 + Math.floor(R() * 90000), diasAteAgora: dur,
        relato: 'Serviço de ' + pac.map((p) => p[0].toLowerCase()).join(', ') + '.', itens, pagamentos: pags, custos });
    }

    // Despesas gerais da oficina (não ligadas a um carro).
    for (let m = 5; m >= 0; m--) {
      const base = today0(); base.setDate(1); base.setMonth(base.getMonth() - m);
      const dia = (d) => { const x = new Date(base); x.setDate(d); x.setHours(10); return x.toISOString(); };
      const futuro = (d) => new Date(dia(d)) > new Date();
      [['Aluguel do galpão', 'Aluguel', 4500, 5], ['Folha de pagamento', 'Folha de pagamento', 11800, 5], ['Energia elétrica (cabine e compressor)', 'Energia', 1150 + Math.round(R() * 350), 12], ['Estoque de lixas, fitas e EPIs', 'Tintas e materiais', 1400 + Math.round(R() * 700), 15], ['Simples Nacional', 'Impostos', 2100 + Math.round(R() * 600), 20], ['Contabilidade', 'Contabilidade', 900, 10], ['Internet e telefone', 'Internet e telefone', 260, 8]]
        .forEach(([descricao, categoria, valor, d]) => db.despesas.push({ id: uid(), data: dia(d), descricao, categoria, valor, pago: !futuro(d) }));
    }
    db.despesas.push({ id: uid(), data: isoDay(-9), descricao: 'Manutenção da cabine de pintura (filtros)', categoria: 'Manutenção de equipamentos', valor: 1350, pago: true });

    // Estoque de materiais: quantidade atual, mínimo e custo médio.
    const E = (nome, categoria, unidade, qtd, minimo, custo, fornecedor) => { const e = { id: uid(), nome, categoria, unidade, qtd, minimo, custo, fornecedor, local: '' }; db.estoque.push(e); return e; };
    const FORN_T = 'Distribuidora de tintas (exemplo)', FORN_E = 'Loja de estética automotiva (exemplo)', FORN_G = 'Atacado de insumos (exemplo)';
    const est = {
      preto: E('Base poliéster preta', 'Tintas e vernizes', 'L', 6, 4, 165, FORN_T),
      branco: E('Base poliéster branca', 'Tintas e vernizes', 'L', 3, 4, 150, FORN_T),
      prata: E('Base poliéster prata', 'Tintas e vernizes', 'L', 5, 3, 172, FORN_T),
      verniz: E('Verniz HS 2K', 'Tintas e vernizes', 'L', 8, 6, 118, FORN_T),
      catalisador: E('Catalisador para verniz', 'Tintas e vernizes', 'L', 2, 3, 96, FORN_T),
      thinner: E('Thinner', 'Tintas e vernizes', 'L', 18, 10, 28, FORN_T),
      primer: E('Primer PU 5:1', 'Primers e massas', 'L', 7, 4, 88, FORN_T),
      massa: E('Massa poliéster', 'Primers e massas', 'kg', 9, 5, 32, FORN_T),
      p400: E('Disco de lixa P400 (cx 100)', 'Abrasivos', 'cx', 3, 2, 145, FORN_G),
      p800: E('Disco de lixa P800 (cx 100)', 'Abrasivos', 'cx', 1, 2, 150, FORN_G),
      p1500: E("Lixa d'água P1500", 'Abrasivos', 'un', 60, 50, 3.2, FORN_G),
      boina: E('Boina de lã para polimento', 'Abrasivos', 'un', 4, 4, 68, FORN_E),
      corte: E('Composto polidor de corte', 'Polimento e vitrificação', 'L', 2, 2, 135, FORN_E),
      refino: E('Lustrador de refino', 'Polimento e vitrificação', 'L', 3, 2, 128, FORN_E),
      vitri: E('Vitrificador 9H (50 ml)', 'Polimento e vitrificação', 'un', 5, 4, 210, FORN_E),
      shampoo: E('Shampoo automotivo neutro', 'Polimento e vitrificação', 'L', 10, 5, 22, FORN_E),
      nano: E('Película nano cerâmica (rolo 30 m)', 'Películas e PPF', 'rolo', 1, 1, 1450, FORN_E),
      fume: E('Película fumê G20 (rolo 30 m)', 'Películas e PPF', 'rolo', 0, 1, 620, FORN_E),
      ppf: E('Filme PPF', 'Películas e PPF', 'm', 6, 5, 290, FORN_E),
      fita: E('Fita crepe 18 mm', 'Fitas e mascaramento', 'rolo', 24, 20, 6.5, FORN_G),
      papel: E('Papel de mascaramento', 'Fitas e mascaramento', 'rolo', 3, 2, 58, FORN_G),
      mascara: E('Filtro para máscara respiradora', 'EPIs', 'un', 4, 6, 39, FORN_G),
      luvas: E('Luvas nitrílicas (cx 100)', 'EPIs', 'cx', 2, 2, 52, FORN_G),
      presilha: E('Presilhas de para-choque (pct 50)', 'Peças', 'pct', 12, 10, 18, FORN_G),
    };
    const osNum = (n) => db.os.find((o) => o.numero === n);
    const usos = [
      [est.preto, 1042, 2, -4], [est.verniz, 1042, 1.5, -2], [est.primer, 1042, 1, -3], [est.massa, 1042, 0.5, -4], [est.fita, 1042, 3, -3],
      [est.vitri, 1040, 1, -2], [est.nano, 1040, 0.4, -2], [est.corte, 1040, 0.3, -3],
      [est.ppf, 1037, 4, -3], [est.vitri, 1037, 1, -3],
      [est.massa, 1039, 1, -3], [est.primer, 1039, 1, -2], [est.p400, 1039, 0.2, -3],
      [est.branco, 1038, 1, -4], [est.verniz, 1038, 1, -4], [est.mascara, null, 2, -6],
    ];
    const comprado = new Map();
    usos.forEach(([e, , q]) => comprado.set(e, (comprado.get(e) || 0) + q));
    Object.values(est).forEach((e) => {
      const q = e.qtd + (comprado.get(e) || 0);
      if (q > 0) db.movEstoque.push({ id: uid(), data: isoDay(-40, 10), itemId: e.id, tipo: 'entrada', qtd: q, custoUnit: e.custo, osId: null, obs: 'Compra com ' + e.fornecedor });
    });
    usos.forEach(([e, n, q, d]) => { const o = n && osNum(n); db.movEstoque.push({ id: uid(), data: isoDay(d, 14), itemId: e.id, tipo: 'saida', qtd: q, custoUnit: e.custo, osId: o ? o.id : null, obs: o ? `Usado na OS ${n}` : 'Uso geral da oficina' }); });

    // Agenda dos próximos dias (domingo pula para segunda).
    const diaUtil = (off, h, m = 0) => { const d = today0(); d.setDate(d.getDate() + off); if (d.getDay() === 0) d.setDate(d.getDate() + 1); d.setHours(h, m, 0, 0); return d.toISOString(); };
    const A = (data, tipo, cliente, telefone, placa, modelo, servico) => db.agenda.push({ id: uid(), data, tipo, cliente, telefone, placa, modelo, servico, obs: '' });
    A(diaUtil(0, 11), 'Orçamento', 'Pedro Alves', '(91) 98190-2235', 'QEB7C21', 'Toyota Hilux SRV', 'Pintura do capô e para-lama');
    A(diaUtil(0, 16, 30), 'Retirada', 'Larissa Pantoja', '(91) 98301-6624', 'PZK6G31', 'Hyundai HB20 Comfort', 'Retirada após reparo do para-choque');
    A(diaUtil(1, 8, 30), 'Entrada de carro', 'Fernanda Quaresma', '(91) 99312-7756', 'RNE8C40', 'Nissan Kicks Exclusive', 'Polimento técnico e vitrificação');
    A(diaUtil(1, 14), 'Orçamento', 'Gustavo Ramos', '(91) 98222-3344', 'SBQ2E90', 'Toyota Corolla Cross', 'Amassado na porta traseira');
    A(diaUtil(2, 10), 'Orçamento', 'Camila Nunes', '(91) 98455-7012', 'RPZ4H18', 'Volkswagen Polo', 'Risco profundo no para-choque');
    A(diaUtil(3, 9), 'Entrada de carro', 'Thiago Corrêa', '(91) 98023-4418', 'SAA1H93', 'Volkswagen T-Cross', 'Película nano cerâmica completa');
    A(diaUtil(5, 8), 'Entrada de carro', 'Beatriz Tavares', '(91) 98760-1193', 'PZT3E77', 'Fiat Pulse Impetus', 'Higienização e polimento');

    db.os.sort((a, b) => b.numero - a.numero);
    return db;
  }

  // ---------- armazenamento ----------
  let db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || !db.os) { db = seed(); save(); }
    return db;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { console.warn('Falha ao salvar', e); return false; }
  }
  function reset() { db = seed(); save(); return db; }

  const find = {
    os: (id) => db.os.find((o) => o.id === id),
    osNumero: (n) => db.os.find((o) => String(o.numero) === String(n)),
    veiculo: (id) => db.veiculos.find((v) => v.id === id),
    cliente: (id) => db.clientes.find((c) => c.id === id),
    estoque: (id) => db.estoque.find((e) => e.id === id),
    membro: (id) => (db.equipe || []).find((e) => e.id === id),
    veiculoPlaca: (p) => db.veiculos.find((v) => v.placa.replace(/\W/g, '').toUpperCase() === String(p).replace(/\W/g, '').toUpperCase()),
  };

  function setStatus(os, status, nota = '') {
    os.status = status;
    if (aprovada(os) && !os.aprovadoEm) os.aprovadoEm = new Date().toISOString();
    if (status === 'entregue') { os.entrega = new Date().toISOString(); os.saida.data = os.entrega; }
    os.historico.unshift({ id: uid(), data: new Date().toISOString(), status, nota });
    save();
  }
  function proximaEtapa(os) {
    const etapas = FLUXOS[os.fluxo].etapas;
    return etapas[etapas.indexOf(os.status) + 1] || null;
  }
  const portalUrl = (os) => `${location.href.split(/[?#]/)[0].replace(/[^/]*$/, '')}acompanhar.html?os=${os.numero}&c=${os.codigo}`;
  const waLink = (tel, msg) => `https://wa.me/${String(tel).replace(/\D/g, '').replace(/^(?!55)/, '55')}?text=${encodeURIComponent(msg)}`;

  window.PF = {
    KEY, DAY, OFICINA, STATUS, FLUXOS, PECAS, AVARIAS, ITENS_ENTRADA, CHECK_SAIDA, FORMAS, CAT_CUSTO, CAT_DESPESA, CAR_BODY, CAR_GLASS,
    SEGURADORAS, AUTORIZACAO, CAT_ESTOQUE, UNIDADES, TIPOS_AGENDA,
    fmt, esc, uid, isoDay, today0, toInputDate, fromInputDate, carPhoto, diagramSVG, labelAvaria, nomePeca, plate, statusOf, chip,
    aprovada, itemAtivo, temSeguradora, totais, extenso, garantiaDe, executorPadrao, load, save, reset, find, setStatus, proximaEtapa, portalUrl, waLink,
    get db() { return db; },
  };
  load();
})();
