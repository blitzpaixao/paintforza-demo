/* PAINT FORZA — sistema da oficina (SPA com rotas por hash) */
(function () {
  const { fmt, esc } = PF;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const view = $('#view');
  const SESSAO = 'pf_sessao';
  const ui = { osFiltro: 'ativas', osBusca: '', veicBusca: '', cliBusca: '', periodo: '6m', lancTipo: 'todos', veicOrdem: 'faturado', estBusca: '', estCat: 'todas', estBaixo: false, semana: 0 };
  let rotaAtual = '';

  // ---------- atalhos de dados ----------
  const db = () => PF.db;
  const veic = (os) => PF.find.veiculo(os.veiculoId) || {};
  const cli = (os) => PF.find.cliente(os.clienteId) || {};
  const nomeCarro = (v) => `${v.marca} ${v.modelo}`;
  const primeiroNome = (c) => (c.tipo === 'PJ' ? c.nome : String(c.nome || '').split(' ')[0]);
  const soma = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const atrasada = (os) => !['pronto', 'entregue'].includes(os.status) && new Date(os.previsao) < PF.today0();
  const carroCel = (v, extra = '') => `<span class="carro-cel">${PF.plate(v.placa)}<span><b>${esc(nomeCarro(v))}</b><span class="sub">${esc(extra || `${v.ano}, ${v.cor}`)}</span></span></span>`;
  const quandoEtapa = (os, st) => { const h = os.historico.find((x) => x.status === st); return h ? h.data : null; };
  const ICON_ZAP = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.2c0-.1-.2-.2-.5-.3z"/></svg>';

  function todosPagamentos() {
    return db().os.flatMap((os) => os.pagamentos.map((p) => ({ ...p, os })));
  }
  function todosCustos() {
    return db().os.flatMap((os) => os.custos.map((c) => ({ ...c, os })));
  }
  function inicioPeriodo(p) {
    const d = PF.today0();
    if (p === 'mes') { d.setDate(1); return d; }
    if (p === '3m') { d.setDate(1); d.setMonth(d.getMonth() - 2); return d; }
    if (p === '6m') { d.setDate(1); d.setMonth(d.getMonth() - 5); return d; }
    return new Date(0);
  }
  const noPeriodo = (iso) => new Date(iso) >= inicioPeriodo(ui.periodo) && new Date(iso) <= new Date(Date.now() + 400 * PF.DAY);

  function serieMensal(n = 6) {
    const out = [];
    const pags = todosPagamentos(), custos = todosCustos();
    for (let i = n - 1; i >= 0; i--) {
      const ini = PF.today0(); ini.setDate(1); ini.setMonth(ini.getMonth() - i);
      const fim = new Date(ini); fim.setMonth(fim.getMonth() + 1);
      const dentro = (iso) => { const d = new Date(iso); return d >= ini && d < fim; };
      out.push({
        label: fmt.month(ini),
        a: soma(pags.filter((p) => dentro(p.data)), (p) => p.valor),
        b: soma(custos.filter((c) => dentro(c.data)), (c) => c.valor) + soma(db().despesas.filter((d) => dentro(d.data)), (d) => d.valor),
      });
    }
    return out;
  }
  function grafico(serie) {
    const W = 640, H = 230, pad = { l: 44, r: 8, t: 12, b: 28 };
    const max = Math.max(1, ...serie.flatMap((s) => [s.a, s.b]));
    const topo = Math.ceil(max / 10000) * 10000;
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const gw = iw / serie.length, bw = Math.min(26, gw / 3);
    const y = (v) => pad.t + ih - (v / topo) * ih;
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = (topo / 4) * i;
      g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#E4E6E8"/><text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${v >= 1000 ? Math.round(v / 1000) + 'k' : v}</text>`;
    }
    serie.forEach((s, i) => {
      const cx = pad.l + gw * i + gw / 2;
      g += `<rect x="${cx - bw - 2}" y="${y(s.a)}" width="${bw}" height="${pad.t + ih - y(s.a)}" fill="#000" rx="2"><title>Recebido em ${s.label}: ${fmt.money(s.a)}</title></rect>`;
      g += `<rect x="${cx + 2}" y="${y(s.b)}" width="${bw}" height="${pad.t + ih - y(s.b)}" fill="#B9BEC3" rx="2"><title>Despesas em ${s.label}: ${fmt.money(s.b)}</title></rect>`;
      g += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${s.label}</text>`;
    });
    return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Recebido e despesas por mês">${g}</svg>
      <div class="grafico-leg"><span><i style="background:#000"></i>Recebido</span><span><i style="background:#B9BEC3"></i>Despesas (custos dos carros e da oficina)</span></div>`;
  }

  // ---------- interface: modal, aviso, confirmação ----------
  const modalEl = $('#modal'), modalBox = $('.modal__caixa', modalEl);
  let modalAoFechar = null;
  function modal(html, { largo = false, aoAbrir, aoFechar } = {}) {
    modalBox.className = 'modal__caixa' + (largo ? ' largo' : '');
    modalBox.innerHTML = `<button class="x modal__fechar" data-action="fechar-modal" aria-label="Fechar">×</button>${html}`;
    modalEl.hidden = false;
    modalAoFechar = aoFechar || null;
    const foco = $('input:not([type=hidden]), select, textarea, button.btn', modalBox);
    if (foco) setTimeout(() => foco.focus(), 30);
    if (aoAbrir) aoAbrir(modalBox);
  }
  function fecharModal() { modalEl.hidden = true; modalBox.innerHTML = ''; if (modalAoFechar) { const f = modalAoFechar; modalAoFechar = null; f(); } }
  function confirmar(texto, ok = 'Confirmar', perigo = false) {
    return new Promise((res) => {
      modal(`<h2>Confirme</h2><p>${texto}</p><div class="modal__acoes"><button class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn ${perigo ? 'btn--danger' : ''}" id="okConf">${esc(ok)}</button></div>`, {
        aoAbrir: (m) => { $('#okConf', m).onclick = () => { modalAoFechar = null; fecharModal(); res(true); }; },
        aoFechar: () => res(false),
      });
    });
  }
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }
  function salvar(msg) {
    if (!PF.save()) { toast('Não foi possível salvar: o armazenamento do navegador está cheio. Remova algumas fotos.'); return false; }
    if (msg) toast(msg);
    return true;
  }
  const formDados = (form) => Object.fromEntries(new FormData(form).entries());

  // ---------- documentos em PDF ----------
  const ICON_SETA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
  function abrirDocumentos(os) {
    const pronto = ['pronto', 'entregue'].includes(os.status);
    const opcoes = [
      ['orcamento', 'Orçamento', 'Serviços, valores, condições e QR Code para aprovar'],
      ['laudo', 'Laudo de vistoria', 'Avarias, fotos e itens registrados na entrada'],
      ...(pronto ? [['termo', 'Termo de entrega', 'Checklist de qualidade, antes e depois e assinatura'], ['garantia', 'Certificado de garantia', 'Prazo de garantia de cada serviço']] : []),
    ];
    modal(`<h2>Documentos da OS ${os.numero}</h2>
      <div class="docs-lista">
        ${opcoes.map(([k, n, d]) => `<button type="button" data-doc="${k}"><span><b>${n}</b><span>${d}</span></span>${ICON_SETA}</button>`).join('')}
        ${os.pagamentos.map((p, i) => `<button type="button" data-recibo="${p.id}"><span><b>Recibo ${i + 1}</b><span>${fmt.money(p.valor)} em ${fmt.date(p.data)}, ${esc(p.forma)}</span></span>${ICON_SETA}</button>`).join('')}
      </div>
      ${pronto ? '' : '<p class="nota" style="margin-top:14px">Termo de entrega e certificado de garantia ficam disponíveis quando o carro estiver pronto.</p>'}`, {
      aoAbrir: (m) => {
        $$('[data-doc]', m).forEach((b) => { b.onclick = () => verDocumento(os, b.dataset.doc); });
        $$('[data-recibo]', m).forEach((b) => { b.onclick = () => verDocumento(os, 'recibo', os.pagamentos.find((p) => p.id === b.dataset.recibo)); });
      },
    });
  }
  function verDocumento(os, tipo, pagamento) {
    const c = cli(os), v = veic(os);
    const nomeDoc = tipo === 'recibo' ? 'Recibo' : PFDocs.TIPOS[tipo].nome;
    const html = tipo === 'recibo' ? PFDocs.recibo(os, pagamento) : PFDocs.TIPOS[tipo].fn(os);
    const msg = `Olá, ${primeiroNome(c)}! Segue o ${nomeDoc.toLowerCase()} da OS ${os.numero} (${nomeCarro(v)}). Qualquer dúvida, estamos à disposição. Paint Forza`;
    mostrarPDF(nomeDoc, html, `${nomeDoc} OS ${os.numero} ${v.placa}.pdf`, c.telefone, msg, () => abrirDocumentos(os));
  }
  function mostrarPDF(nome, html, arquivo, telefone, msg, voltar) {
    modal(`<h2>${esc(nome)}</h2><div class="pdf-previa"><div class="pdf-zoom">${html}</div></div>
      <div class="modal__acoes">${voltar ? '<button class="btn btn--ghost" id="docVoltar" type="button">Voltar</button>' : ''}<button class="btn btn--ghost" id="docBaixar" type="button">Baixar PDF</button>${telefone ? `<button class="btn" id="docEnviar" type="button">${ICON_ZAP}Enviar no WhatsApp</button>` : ''}</div>`, {
      largo: true,
      aoAbrir: (m) => {
        const previa = $('.pdf-previa', m), folha = $('.pdf', m);
        $('.pdf-zoom', m).style.zoom = Math.min(1, (previa.clientWidth - 32) / 794);
        PFDocs.prepararQR(m);
        const ocupado = async (btn, fn) => {
          const antes = btn.innerHTML; btn.disabled = true; btn.textContent = 'Gerando PDF…';
          try { await fn(); } catch (err) { console.error(err); if (err.name !== 'AbortError') toast('Não foi possível gerar o PDF.'); }
          btn.disabled = false; btn.innerHTML = antes;
        };
        if (voltar) $('#docVoltar', m).onclick = voltar;
        $('#docBaixar', m).onclick = (e) => ocupado(e.currentTarget, async () => { await PFDocs.baixar(folha, arquivo); toast('PDF baixado.'); });
        const env = $('#docEnviar', m);
        if (env) env.onclick = (e) => ocupado(e.currentTarget, async () => { if ((await PFDocs.enviar(folha, arquivo, telefone, msg)) === 'baixado') toast('PDF baixado. Anexe o arquivo na conversa do WhatsApp que abriu.'); });
      },
    });
  }

  // ---------- entrada no sistema ----------
  function iniciar() {
    if (sessionStorage.getItem(SESSAO)) { $('#entrar').hidden = true; $('#shell').hidden = false; rota(); }
    else { $('#entrar').hidden = false; $('#shell').hidden = true; }
  }
  $('#btnEntrar').onclick = () => { sessionStorage.setItem(SESSAO, '1'); if (!location.hash) location.hash = '#/painel'; iniciar(); };
  $('#btnSair').onclick = () => { sessionStorage.removeItem(SESSAO); iniciar(); };

  // ---------- rotas ----------
  const ROTAS = [
    [/^\/painel$/, painel],
    [/^\/patio$/, patio],
    [/^\/os$/, osLista],
    [/^\/os\/([^/]+)\/imprimir$/, osImprimir],
    [/^\/os\/([^/]+)(?:\/(\w+))?$/, osDetalhe],
    [/^\/veiculos$/, veiculos],
    [/^\/veiculos\/([^/]+)$/, veiculo],
    [/^\/clientes$/, clientes],
    [/^\/clientes\/([^/]+)$/, cliente],
    [/^\/financeiro(?:\/(\w+))?$/, financeiro],
    [/^\/agenda$/, agenda],
    [/^\/estoque$/, estoque],
    [/^\/estoque\/([^/]+)$/, estoqueItem],
    [/^\/mais$/, mais],
    [/^\/config$/, config],
  ];
  function rota(manterScroll) {
    const path = location.hash.slice(1) || '/painel';
    const secao = path.split('/')[1];
    $$('.menu a').forEach((a) => a.classList.toggle('is-ativo', a.dataset.nav === secao));
    for (const [re, fn] of ROTAS) {
      const m = path.match(re);
      if (m) {
        const y = scrollY;
        fn(...m.slice(1));
        if (manterScroll) scrollTo(0, y);
        else if (rotaAtual.split('/').slice(0, 3).join('/') !== path.split('/').slice(0, 3).join('/')) scrollTo(0, 0);
        rotaAtual = path;
        return;
      }
    }
    location.hash = '#/painel';
  }
  const render = () => rota(true);
  window.addEventListener('hashchange', () => { if (!$('#shell').hidden) rota(); });
  const titulo = (t) => { document.title = `${t} — Paint Forza`; };

  // ---------- PAINEL ----------
  function painel() {
    titulo('Painel');
    const ativos = db().os.filter((o) => o.status !== 'entregue');
    const mesIni = inicioPeriodo('mes');
    const recebidoMes = soma(todosPagamentos().filter((p) => new Date(p.data) >= mesIni), (p) => p.valor);
    const aReceber = soma(db().os, (o) => PF.totais(o).saldo);
    const aguard = ativos.filter((o) => o.status === 'aprovacao');
    const prontos = ativos.filter((o) => o.status === 'pronto');
    const emServico = ativos.filter((o) => o.status !== 'pronto').sort((a, b) => new Date(a.previsao) - new Date(b.previsao));
    const atrasadas = emServico.filter(atrasada).length;
    const movs = db().os.flatMap((os) => os.historico.map((h) => ({ ...h, os }))).sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 7);
    const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const baixoEst = abaixoMinimo();
    const agHoje = eventosDoDia(PF.today0()).filter((e) => e.fonte === 'agenda');
    const pos = posVenda();

    view.innerHTML = `
      <div class="pg-topo"><div><h1>Painel</h1><p>${esc(hoje.charAt(0).toUpperCase() + hoje.slice(1))}</p></div></div>
      ${baixoEst.length ? `<div class="aviso"><span><b>${baixoEst.length} itens do estoque</b> estão abaixo do mínimo.</span><span class="pg-acoes"><a class="btn btn--ghost" href="#/estoque">Ver estoque</a><button class="btn" data-action="est-compras">Lista de compras</button></span></div>` : ''}
      <div class="kpis">
        <a class="kpi" href="#/patio"><span>Carros no pátio</span><strong class="num">${ativos.length}</strong><small>${atrasadas ? `<b class="neg">${atrasadas} com prazo vencido</b>` : 'Todos dentro do prazo'}</small></a>
        <a class="kpi" href="#/os"><span>Aguardando aprovação</span><strong class="num">${aguard.length}</strong><small>${fmt.money(soma(aguard, (o) => PF.totais(o).total))} em orçamentos</small></a>
        <a class="kpi" href="#/patio"><span>Prontos para retirada</span><strong class="num">${prontos.length}</strong><small>${fmt.money(soma(prontos, (o) => PF.totais(o).saldo))} a receber na entrega</small></a>
        <a class="kpi is-destaque" href="#/financeiro"><span>Recebido no mês</span><strong class="num">${fmt.money(recebidoMes)}</strong><small>Pagamentos registrados nas OS</small></a>
        <a class="kpi" href="#/financeiro/geral"><span>A receber</span><strong class="num">${fmt.money(aReceber)}</strong><small>Saldo das OS aprovadas</small></a>
      </div>
      <div class="grade grade-3-1">
        <div class="grade">
          <section class="bloco">
            <h2>Em serviço <small>ordenado pela previsão de entrega</small></h2>
            ${emServico.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Carro</th><th>Etapa</th><th>Cliente</th><th class="r">Previsão</th></tr></thead><tbody>
              ${emServico.map((os) => `<tr data-href="#/os/${os.id}"><td>${carroCel(veic(os), 'OS ' + os.numero)}</td><td>${PF.chip(os.status)}</td><td>${esc(cli(os).nome)}</td><td class="r ${atrasada(os) ? 'neg' : ''}">${fmt.date(os.previsao)}${atrasada(os) ? '<span class="sub neg">vencida</span>' : ''}</td></tr>`).join('')}
            </tbody></table></div>` : '<p class="vazio">Nenhum carro em serviço agora.</p>'}
          </section>
          <section class="bloco"><h2>Recebido e despesas <small>últimos 6 meses</small></h2>${grafico(serieMensal())}</section>
        </div>
        <div class="grade" style="align-content:start">
          <section class="bloco"><h2>Hoje na agenda <a class="btn btn--sm btn--ghost" href="#/agenda">Agenda</a></h2>
            ${agHoje.length ? `<ul class="agenda-mini">${agHoje.map((a) => `<li style="--c:${COR_AGENDA[a.tipo]}"><time>${hora(a.data)}</time><span><b>${esc(a.cliente)}</b><span class="sub">${esc(a.tipo)}, ${esc(a.modelo)}</span></span></li>`).join('')}</ul>` : '<p class="vazio">Nada agendado para hoje.</p>'}
          </section>
          <section class="bloco">
            <h2>Prontos para retirada</h2>
            ${prontos.length ? prontos.map((os) => { const t = PF.totais(os); const c = cli(os); return `
              <div style="display:grid;gap:8px;padding:12px 0;border-bottom:1px solid var(--line)">
                <a href="#/os/${os.id}" style="text-decoration:none">${carroCel(veic(os), c.nome)}</a>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                  <span class="nota">${t.saldo ? `Saldo <b class="alerta">${fmt.money(t.saldo)}</b>` : '<b class="pos">Pago</b>'}</span>
                  <a class="btn btn--sm btn--ghost" target="_blank" rel="noopener" href="${PF.waLink(c.telefone, `Olá, ${primeiroNome(c)}! Aqui é da Paint Forza. Seu ${nomeCarro(veic(os))} está pronto para retirada.${t.saldo ? ` O saldo a pagar é de ${fmt.money(t.saldo)}.` : ''} Acompanhe pelo link: ${PF.portalUrl(os)}`)}">${ICON_ZAP}Avisar</a>
                </div></div>`; }).join('') : '<p class="vazio">Nenhum carro pronto no momento.</p>'}
          </section>
          <section class="bloco"><h2>Pós-venda <small>clientes para chamar</small></h2>
            ${pos.length ? pos.map((p) => `<div class="posvenda"><div><span class="posvenda__tipo">${esc(p.tipo)}</span><b>${esc(cli(p.os).nome)}</b><span class="sub">${esc(nomeCarro(veic(p.os)))}. ${esc(p.texto)}</span></div><a class="btn btn--sm btn--ghost" target="_blank" rel="noopener" href="${PF.waLink(cli(p.os).telefone, p.msg)}">${ICON_ZAP}Chamar</a></div>`).join('') : '<p class="vazio">Ninguém para chamar agora.</p>'}
          </section>
          <section class="bloco">
            <h2>Últimas movimentações</h2>
            <ul class="historico">${movs.map((h) => `<li style="--c:${h.status ? PF.statusOf(h.status).color : 'var(--steel)'}"><time>${fmt.dateTime(h.data)}</time><a href="#/os/${h.os.id}"><b>OS ${h.os.numero}</b></a> ${esc(veic(h.os).placa)}: ${h.status ? esc(PF.statusOf(h.status).label) : ''}${h.nota ? `<div class="nota">${esc(h.nota)}</div>` : ''}</li>`).join('')}</ul>
          </section>
        </div>
      </div>`;
  }

  function posVenda() {
    const lista = [], agora = Date.now();
    const dias = (iso) => (agora - new Date(iso)) / PF.DAY;
    db().os.forEach((os) => {
      const nome = primeiroNome(cli(os)), carro = nomeCarro(veic(os));
      const entregueHa = os.status === 'entregue' && os.entrega ? dias(os.entrega) : null;
      if (entregueHa !== null && entregueHa <= 5) lista.push({ os, tipo: 'Pedir avaliação', texto: `Entregue em ${fmt.dateShort(os.entrega)}`, msg: `Olá, ${nome}! Obrigado por confiar seu ${carro} à Paint Forza. Se puder, conte como foi sua experiência. Sua avaliação ajuda muito a gente!` });
      if (entregueHa !== null && entregueHa >= 150 && entregueHa <= 220 && os.itens.some((i) => PF.itemAtivo(i) && /vitrifica/i.test(i.descricao))) lista.push({ os, tipo: 'Manutenção da vitrificação', texto: `Vitrificado em ${fmt.date(os.entrega)}`, msg: `Olá, ${nome}! Já faz 6 meses da vitrificação do seu ${carro}. Que tal agendar a manutenção para manter o brilho e a garantia?` });
      const recusados = os.itens.filter((i) => !PF.itemAtivo(i));
      if (recusados.length && PF.aprovada(os) && dias(os.abertura) <= 90) lista.push({ os, tipo: 'Oferecer de novo', texto: recusados.map((i) => i.descricao).join(', '), msg: `Olá, ${nome}! Lembra do serviço de ${recusados[0].descricao.toLowerCase()} que ficou para depois no seu ${carro}? Conseguimos encaixar esta semana. Quer agendar?` });
    });
    return lista.slice(0, 6);
  }

  // ---------- PÁTIO ----------
  function patio() {
    titulo('Pátio');
    const cols = PF.STATUS.filter((s) => s.id !== 'entregue');
    const ativos = db().os.filter((o) => o.status !== 'entregue');
    view.innerHTML = `
      <div class="pg-topo"><div><h1>Pátio</h1><p>Arraste o cartão para mudar a etapa, ou use Avançar.</p></div></div>
      <div class="patio">
        ${cols.map((s) => { const lista = ativos.filter((o) => o.status === s.id).sort((a, b) => new Date(a.previsao) - new Date(b.previsao)); return `
          <section class="coluna" data-status="${s.id}" style="--c:${s.color}">
            <h2>${esc(s.label)} <span>${lista.length}</span></h2>
            ${lista.map(cartao).join('')}
          </section>`; }).join('')}
      </div>`;

    $$('.cartao', view).forEach((c) => {
      c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('is-arrastando'); });
      c.addEventListener('dragend', () => c.classList.remove('is-arrastando'));
    });
    $$('.coluna', view).forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('is-alvo'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-alvo'));
      col.addEventListener('drop', (e) => {
        e.preventDefault(); col.classList.remove('is-alvo');
        const os = PF.find.os(e.dataTransfer.getData('text/plain'));
        if (os && os.status !== col.dataset.status) moverEtapa(os, col.dataset.status);
      });
    });
  }
  function cartao(os) {
    const v = veic(os), c = cli(os), prox = PF.proximaEtapa(os);
    return `<a class="cartao" href="#/os/${os.id}" draggable="true" data-id="${os.id}">
      <div class="cartao__topo">${PF.plate(v.placa)}<span class="cartao__os">OS ${os.numero}</span></div>
      <div class="cartao__modelo"><i class="cartao__cor" style="background:${v.corHex}"></i>${esc(nomeCarro(v))}</div>
      <div class="nota">${esc(c.nome)}</div>
      <div class="cartao__pe"><span class="${atrasada(os) ? 'atrasado' : ''}">Previsão ${fmt.dateShort(os.previsao)}</span>${prox ? `<button data-action="avancar" data-id="${os.id}" title="Avançar para ${esc(PF.statusOf(prox).label)}">Avançar</button>` : ''}</div>
    </a>`;
  }
  function moverEtapa(os, status) {
    if (!PF.FLUXOS[os.fluxo].etapas.includes(status)) os.fluxo = 'completo';
    if (status === 'entregue') { registrarEntrega(os); return; }
    PF.setStatus(os, status);
    toast(`OS ${os.numero} agora está em ${PF.statusOf(status).label}.`);
    render();
  }
  async function registrarEntrega(os) {
    const t = PF.totais(os);
    if (t.saldo > 0 && !(await confirmar(`Ainda há <b>${fmt.money(t.saldo)}</b> a receber nesta OS. Registrar a entrega mesmo assim?`, 'Registrar entrega'))) return;
    PF.setStatus(os, 'entregue', 'Carro entregue ao cliente.');
    toast(`Entrega da OS ${os.numero} registrada.`);
    render();
  }

  // ---------- LISTA DE OS ----------
  function osLista() {
    titulo('Ordens de serviço');
    const q = ui.osBusca.trim().toLowerCase();
    let lista = db().os.filter((os) => {
      if (ui.osFiltro === 'ativas' && os.status === 'entregue') return false;
      if (!['ativas', 'todas'].includes(ui.osFiltro) && os.status !== ui.osFiltro) return false;
      if (!q) return true;
      const v = veic(os), c = cli(os);
      return [os.numero, v.placa, v.marca, v.modelo, c.nome].join(' ').toLowerCase().includes(q);
    });
    view.innerHTML = `
      <div class="pg-topo"><div><h1>Ordens de serviço</h1><p>${lista.length} ${lista.length === 1 ? 'ordem' : 'ordens'} encontradas</p></div>
        <div class="pg-acoes"><button class="btn btn--tape" data-action="nova-os">Nova OS</button></div></div>
      <div class="filtros">
        <input class="input" id="fBusca" placeholder="Filtrar por placa, carro ou cliente" value="${esc(ui.osBusca)}">
        <select class="select" id="fStatus">
          <option value="ativas">Em andamento</option><option value="todas">Todas</option>
          ${PF.STATUS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}
        </select>
      </div>
      <section class="bloco">
        ${lista.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>OS</th><th>Carro</th><th>Cliente</th><th>Etapa</th><th>Entrada</th><th>Previsão</th><th class="r">Total</th><th class="r">Saldo</th></tr></thead><tbody>
          ${lista.map((os) => { const t = PF.totais(os); return `<tr data-href="#/os/${os.id}"><td><b>${os.numero}</b></td><td>${carroCel(veic(os))}</td><td>${esc(cli(os).nome)}</td><td>${PF.chip(os.status)}</td><td>${fmt.date(os.abertura)}</td><td class="${atrasada(os) ? 'neg' : ''}">${fmt.date(os.previsao)}</td><td class="r">${fmt.money(t.total)}</td><td class="r ${t.saldo ? 'alerta' : ''}">${t.saldo ? fmt.money(t.saldo) : '—'}</td></tr>`; }).join('')}
        </tbody></table></div>` : '<div class="vazio">Nenhuma OS com esses filtros.<br><button class="btn btn--ghost btn--sm" data-action="limpar-filtros-os">Limpar filtros</button></div>'}
      </section>`;
    $('#fStatus').value = ui.osFiltro;
    $('#fStatus').onchange = (e) => { ui.osFiltro = e.target.value; render(); };
    const fb = $('#fBusca');
    fb.oninput = () => { ui.osBusca = fb.value; clearTimeout(fb._t); fb._t = setTimeout(() => { render(); const n = $('#fBusca'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  }

  // ---------- DETALHE DA OS ----------
  const ABAS = [['resumo', 'Resumo'], ['entrada', 'Vistoria de entrada'], ['servicos', 'Serviços e valores'], ['saida', 'Saída'], ['financeiro', 'Financeiro'], ['historico', 'Histórico']];
  function osDetalhe(id, aba = 'resumo') {
    const os = PF.find.os(id);
    if (!os) { view.innerHTML = '<div class="vazio">Esta OS não existe mais. <a href="#/os">Ver todas as OS</a></div>'; return; }
    const v = veic(os), c = cli(os), t = PF.totais(os), prox = PF.proximaEtapa(os);
    titulo(`OS ${os.numero}`);
    const etapas = PF.FLUXOS[os.fluxo].etapas, idx = etapas.indexOf(os.status);
    const pendEntrada = !os.entrada.avarias.length && !os.entrada.fotos.length;

    view.innerHTML = `
      <a class="voltar no-print" href="#/os">‹ Ordens de serviço</a>
      <div class="os-cab">
        ${PF.plate(v.placa, 'lg')}
        <div><h1>OS ${os.numero}</h1><p>${esc(nomeCarro(v))} ${v.ano}, ${esc(v.cor)}. Cliente: <a href="#/clientes/${c.id}">${esc(c.nome)}</a></p></div>
        <div class="pg-acoes">
          ${prox ? `<button class="btn" data-action="avancar" data-id="${os.id}">Avançar para ${esc(PF.statusOf(prox).label)}</button>` : ''}
          <a class="btn btn--ghost" target="_blank" rel="noopener" href="${PF.waLink(c.telefone, `Olá, ${primeiroNome(c)}! Aqui é da Paint Forza. Acompanhe o serviço do seu ${nomeCarro(v)} (OS ${os.numero}) por este link: ${PF.portalUrl(os)}`)}">${ICON_ZAP}Enviar link ao cliente</a>
          <a class="btn btn--ghost" href="${PF.portalUrl(os)}" target="_blank" rel="noopener">Ver como o cliente</a>
          <button class="btn btn--ghost" data-action="docs" data-id="${os.id}">Documentos em PDF</button>
        </div>
      </div>
      <ol class="trilha">${etapas.map((st, i) => { const s = PF.statusOf(st); const q = quandoEtapa(os, st); return `<li class="${i < idx ? 'feito' : i === idx ? 'atual' : ''}" style="--c:${s.color}">${esc(s.label)}<small>${i <= idx && q ? fmt.dateShort(q) : i === etapas.length - 2 ? 'prev. ' + fmt.dateShort(os.previsao) : '&nbsp;'}</small></li>`; }).join('')}</ol>
      <nav class="abas">${ABAS.map(([k, l]) => `<a href="#/os/${os.id}/${k}" class="${k === aba ? 'is-ativa' : ''}">${l}${k === 'entrada' && pendEntrada ? '<span class="ponto" title="Vistoria não preenchida"></span>' : ''}</a>`).join('')}</nav>
      <div id="aba"></div>`;
    const alvo = $('#aba');
    ({ resumo: abaResumo, entrada: abaEntrada, servicos: abaServicos, saida: abaSaida, financeiro: abaFinanceiro, historico: abaHistorico }[aba] || abaResumo)(os, alvo, { v, c, t });
  }

  function abaResumo(os, el, { v, c, t }) {
    el.innerHTML = `
      <div class="grade grade-3-1">
        <div class="grade" style="align-content:start">
          <section class="bloco"><h2>Relato do cliente</h2><p>${esc(os.relato) || '<span class="nota">Sem relato.</span>'}</p>
            ${os.entrada.obs ? `<p class="nota" style="margin-top:10px">Observação: ${esc(os.entrada.obs)}</p>` : ''}</section>
          <section class="bloco"><h2>Como o carro chegou <a class="btn btn--sm btn--ghost" href="#/os/${os.id}/entrada">Abrir vistoria</a></h2>
            <div class="vistoria">
              <div>${PF.diagramSVG(os.entrada.avarias)}</div>
              <div class="grade" style="gap:14px">
                <dl class="dados"><dt>Quilometragem</dt><dd class="num">${os.entrada.km ? os.entrada.km.toLocaleString('pt-BR') + ' km' : '—'}</dd><dt>Combustível</dt><dd>${os.entrada.combustivel}/8</dd><dt>Avarias</dt><dd>${os.entrada.avarias.length}</dd></dl>
                ${listaAvarias(os, false)}
                ${os.entrada.fotos.length ? `<div class="fotos">${os.entrada.fotos.slice(0, 3).map((f) => `<div class="foto"><img src="${f}" alt="Foto de entrada" data-action="ver-foto"></div>`).join('')}</div>` : ''}
              </div>
            </div></section>
          <section class="bloco"><h2>Serviços <a class="btn btn--sm btn--ghost" href="#/os/${os.id}/servicos">Editar</a></h2>
            ${os.itens.length ? `<div class="tabela-wrap"><table class="tabela"><tbody>${os.itens.map((i) => `<tr><td><span class="tipo ${i.tipo}">${i.tipo === 'peca' ? 'Peça' : 'Serviço'}</span> ${esc(i.descricao)}</td><td class="r">${fmt.money(i.qtd * i.valor)}</td></tr>`).join('')}</tbody>
              <tfoot><tr><td>Total${os.desconto ? ` (desconto de ${fmt.money(os.desconto)})` : ''}</td><td class="r">${fmt.money(t.total)}</td></tr></tfoot></table></div>` : '<p class="vazio">Nenhum serviço lançado ainda.</p>'}
          </section>
        </div>
        <div class="grade" style="align-content:start">
          <section class="bloco"><h2>Valores <a class="btn btn--sm btn--ghost" href="#/os/${os.id}/financeiro">Financeiro</a></h2>
            <dl class="dados"><dt>Total da OS</dt><dd class="num">${fmt.money(t.total)}</dd><dt>Recebido</dt><dd class="num pos">${fmt.money(t.pago)}</dd><dt>Saldo</dt><dd class="num ${t.saldo ? 'alerta' : ''}">${PF.aprovada(os) ? fmt.money(t.saldo) : 'Após aprovação'}</dd></dl></section>
          ${blocoSeguro(os, t)}
          <section class="bloco"><h2>Prazos <button class="btn btn--sm btn--ghost" data-action="editar-os" data-id="${os.id}">Editar</button></h2>
            <dl class="dados"><dt>Entrada</dt><dd>${fmt.date(os.abertura)}</dd><dt>Previsão</dt><dd class="${atrasada(os) ? 'neg' : ''}">${fmt.date(os.previsao)}</dd><dt>Entrega</dt><dd>${fmt.date(os.entrega)}</dd><dt>Responsável</dt><dd>${esc(os.responsavel)}</dd><dt>Tipo</dt><dd>${esc(PF.FLUXOS[os.fluxo].label)}</dd><dt>Origem</dt><dd>${esc(os.origem)}${os.sinistro ? `<span class="sub nota">Sinistro ${esc(os.sinistro)}</span>` : ''}</dd></dl></section>
          <section class="bloco"><h2>Cliente</h2>
            <dl class="dados"><dt>Nome</dt><dd><a href="#/clientes/${c.id}">${esc(c.nome)}</a></dd><dt>Telefone</dt><dd><a target="_blank" rel="noopener" href="${PF.waLink(c.telefone, `Olá, ${primeiroNome(c)}! Aqui é da Paint Forza.`)}">${esc(c.telefone)}</a></dd><dt>E-mail</dt><dd>${esc(c.email || '—')}</dd></dl></section>
          <section class="bloco"><h2>Veículo <a class="btn btn--sm btn--ghost" href="#/veiculos/${v.id}">Histórico</a></h2>
            <dl class="dados"><dt>Placa</dt><dd>${esc(v.placa)}</dd><dt>Modelo</dt><dd>${esc(nomeCarro(v))}</dd><dt>Ano</dt><dd>${v.ano}</dd><dt>Cor</dt><dd><i class="cartao__cor" style="background:${v.corHex}"></i>${esc(v.cor)}</dd></dl></section>
        </div>
      </div>`;
  }

  function blocoSeguro(os, t) {
    if (!PF.temSeguradora(os)) return '';
    const s = os.seguradora;
    const cor = { aguardando: '#C9A227', autorizado: '#23864E', negado: '#C8382E' }[s.autorizacao];
    return `<section class="bloco"><h2>Seguradora ${s.autorizacao === 'aguardando' ? `<button class="btn btn--sm" data-action="autorizar" data-id="${os.id}">Marcar autorizado</button>` : ''}</h2>
      <dl class="dados"><dt>Seguradora</dt><dd>${esc(s.nome)}</dd><dt>Sinistro</dt><dd>${esc(os.sinistro || '—')}</dd><dt>Situação</dt><dd><span class="chip" style="--c:${cor}">${PF.AUTORIZACAO[s.autorizacao]}</span></dd>
      <dt>Franquia</dt><dd class="num">${fmt.money(t.parteCliente)}<span class="sub">paga pelo cliente</span></dd><dt>Seguradora paga</dt><dd class="num">${fmt.money(t.parteSeguradora)}</dd></dl></section>`;
  }

  function listaAvarias(os, editavel) {
    const av = os.entrada.avarias;
    if (!av.length) return `<p class="nota">${editavel ? 'Toque numa peça do desenho para marcar uma avaria.' : 'Nenhuma avaria registrada.'}</p>`;
    return `<ul class="avarias-lista">${av.map((a, i) => { const t = PF.AVARIAS.find((x) => x.id === a.tipo) || {}; return `<li><i style="background:${t.cor}"></i><span>${esc(PF.nomePeca(a.peca))}: ${esc(t.label)}${a.obs ? `<small>${esc(a.obs)}</small>` : ''}</span>${editavel ? `<button class="x" data-action="rm-avaria" data-i="${i}" aria-label="Remover avaria">×</button>` : '<span></span>'}</li>`; }).join('')}</ul>`;
  }
  const legenda = () => `<div class="legenda">${PF.AVARIAS.map((a) => `<span><i style="background:${a.cor}"></i>${a.label}</span>`).join('')}</div>`;

  function blocoFotos(os, k, titulo) {
    const fotos = os[k].fotos;
    return `<section class="bloco"><h2>${titulo} <small>${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}</small></h2>
      <div class="fotos">
        ${fotos.map((f, i) => `<div class="foto"><img src="${f}" alt="Foto ${i + 1}" data-action="ver-foto"><button class="x" data-action="rm-foto" data-k="${k}" data-i="${i}" aria-label="Remover foto">×</button></div>`).join('')}
        <label class="foto-add">Adicionar fotos<input type="file" accept="image/*" multiple data-fotos="${k}"></label>
      </div></section>`;
  }
  function blocoAssinatura(os, k, titulo, texto) {
    const a = os[k].assinatura;
    return `<section class="bloco"><h2>${titulo}</h2><div class="assinatura">
      <p class="nota">${texto}</p>
      ${a ? `<img src="${a}" alt="Assinatura"><div class="assinatura__acoes"><span class="nota">Assinado</span><button class="btn btn--sm btn--ghost" data-action="assin-refazer" data-k="${k}">Refazer</button></div>`
        : `<canvas data-assin="${k}" aria-label="Área para assinar com o dedo ou mouse"></canvas><div class="assinatura__acoes"><button class="btn btn--sm btn--ghost" data-action="assin-limpar" data-k="${k}">Limpar</button><button class="btn btn--sm" data-action="assin-salvar" data-k="${k}">Salvar assinatura</button></div>`}
    </div></section>`;
  }

  function abaEntrada(os, el) {
    const e = os.entrada;
    el.innerHTML = `
      <div class="vistoria">
        <section class="bloco" style="align-self:start">
          <h2>Avarias <button class="btn btn--sm btn--ghost" data-action="doc" data-doc="laudo">Laudo em PDF</button></h2>
          ${PF.diagramSVG(e.avarias, { interactive: true })}
          <div style="margin:14px 0">${legenda()}</div>
          ${listaAvarias(os, true)}
        </section>
        <div class="grade" style="align-content:start">
          <section class="bloco"><h2>Dados de entrada <small>${fmt.dateTime(e.data)}</small></h2>
            <div class="form-grade">
              <label class="field"><span>Quilometragem</span><input class="input num" type="number" inputmode="numeric" min="0" value="${e.km || ''}" data-campo="entrada.km" data-tipo="int"></label>
              <div class="field"><span>Combustível</span><div class="combustivel">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<button type="button" class="${n <= e.combustivel ? 'on' : ''}" data-action="comb" data-v="${n}" aria-label="${n} de 8"></button>`).join('')}<span>${e.combustivel}/8</span></div></div>
            </div></section>
          <section class="bloco"><h2>Itens no carro</h2>
            <div class="checks">${PF.ITENS_ENTRADA.map((i) => `<label class="check"><input type="checkbox" data-check="entrada.itens" value="${esc(i)}" ${e.itens[i] ? 'checked' : ''}>${esc(i)}</label>`).join('')}</div></section>
          ${blocoFotos(os, 'entrada', 'Fotos de entrada')}
          <section class="bloco"><h2>Observações</h2><textarea class="textarea" data-campo="entrada.obs" placeholder="Ex.: cliente pediu para guardar as peças trocadas">${esc(e.obs)}</textarea></section>
          ${blocoAssinatura(os, 'entrada', 'Assinatura do cliente na entrada', 'O cliente confirma o estado do carro e as avarias registradas.')}
        </div>
      </div>`;
    iniciarAssinaturas();
    $$('.diagrama .peca', el).forEach((p) => p.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); escolherAvaria(os, p.dataset.peca); } }));
  }
  function escolherAvaria(os, peca) {
    modal(`<h2>${esc(PF.nomePeca(peca))}</h2>
      <label class="field" style="margin-bottom:14px"><span>Detalhe (opcional)</span><input class="input" id="avObs" placeholder="Ex.: amassado de 10 cm perto da maçaneta"></label>
      <div class="picker">${PF.AVARIAS.map((a) => `<button type="button" data-tipo="${a.id}"><i style="background:${a.cor}"></i>${a.label}</button>`).join('')}</div>`, {
      aoAbrir: (m) => $$('[data-tipo]', m).forEach((b) => b.onclick = () => {
        os.entrada.avarias.push({ peca, tipo: b.dataset.tipo, obs: $('#avObs', m).value.trim() });
        salvar('Avaria registrada.'); fecharModal(); render();
      }),
    });
  }

  function abaServicos(os, el, { t }) {
    const st = os.status;
    const equipe = db().equipe || [];
    const aviso = st === 'orcamento'
      ? `<div class="aviso"><span>Orçamento em montagem. Quando terminar, envie para o cliente aprovar pelo celular.</span><button class="btn" data-action="enviar-orcamento" data-id="${os.id}">Enviar para aprovação</button></div>`
      : st === 'aprovacao'
        ? `<div class="aviso"><span>Aguardando o cliente aprovar o orçamento de <b>${fmt.money(t.total)}</b>. Desmarque os itens que ele recusar.</span><span class="pg-acoes"><button class="btn btn--ghost" data-action="reenviar" data-id="${os.id}">Reenviar link</button><button class="btn" data-action="aprovar" data-id="${os.id}">Registrar aprovação</button></span></div>`
        : `<div class="aviso ok"><span>Orçamento aprovado${os.aprovadoEm ? ' em ' + fmt.date(os.aprovadoEm) : ''}.</span></div>`;
    el.innerHTML = `${aviso}
      <section class="bloco">
        <h2>Serviços e peças <button class="btn btn--sm btn--ghost" data-action="doc" data-doc="orcamento">Orçamento em PDF</button></h2>
        ${os.itens.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Tipo</th><th>Descrição</th><th>Quem executa</th><th class="r">Qtd.</th><th class="r">Valor unit.</th><th class="r">Subtotal</th><th>Aprovado</th><th></th></tr></thead><tbody>
          ${os.itens.map((i) => `<tr class="${PF.itemAtivo(i) ? '' : 'item-recusado'}"><td><span class="tipo ${i.tipo}">${i.tipo === 'peca' ? 'Peça' : 'Serviço'}</span></td><td>${esc(i.descricao)}</td>
            <td>${i.tipo === 'servico' ? `<select class="select select--mini" data-item-exec="${i.id}" aria-label="Quem executa ${esc(i.descricao)}"><option value="">Definir</option>${equipe.map((m) => `<option value="${m.id}" ${m.id === i.executorId ? 'selected' : ''}>${esc(m.nome.split(' ')[0])}</option>`).join('')}</select>` : '<span class="nota">—</span>'}</td>
            <td class="r">${i.qtd}</td><td class="r">${fmt.money(i.valor)}</td><td class="r">${fmt.money(i.qtd * i.valor)}</td>
            <td><label class="interruptor"><input type="checkbox" data-item-aprov="${i.id}" ${PF.itemAtivo(i) ? 'checked' : ''}><span></span><b class="sr-only">Item aprovado pelo cliente</b></label></td>
            <td class="r"><button class="x" data-action="rm-item" data-item="${i.id}" aria-label="Remover item">×</button></td></tr>`).join('')}
        </tbody></table></div>
        ${t.recusado ? `<p class="nota" style="margin-top:10px">Itens não aprovados somam ${fmt.money(t.recusado)}. Eles aparecem no painel como oportunidade para oferecer de novo.</p>` : ''}` : '<p class="vazio">Adicione os serviços e peças abaixo para montar o orçamento.</p>'}
        <form class="linha-form" id="formItem">
          <label class="field"><span>Serviço ou peça</span><input class="input" name="descricao" list="catalogo" required placeholder="Escolha da tabela ou digite"></label>
          <label class="field"><span>Tipo</span><select class="select" name="tipo"><option value="servico">Serviço</option><option value="peca">Peça</option></select></label>
          <label class="field"><span>Qtd.</span><input class="input" name="qtd" type="number" min="1" step="1" value="1" required></label>
          <label class="field"><span>Valor unit. (R$)</span><input class="input" name="valor" type="number" min="0" step="0.01" required></label>
          <button class="btn" type="submit">Adicionar</button>
          <datalist id="catalogo">${db().catalogo.map((c) => `<option value="${esc(c.nome)}">${fmt.money(c.valor)}</option>`).join('')}</datalist>
        </form>
        <div class="total-box">
          <label class="field" style="width:180px"><span>Desconto (R$)</span><input class="input num" type="number" min="0" step="0.01" value="${os.desconto || ''}" data-campo="desconto" data-tipo="num"></label>
          <span class="nota">Subtotal ${fmt.money(t.bruto)}</span>
          ${PF.temSeguradora(os) ? `<span class="nota">Franquia do cliente ${fmt.money(t.parteCliente)}, ${esc(os.seguradora.nome)} ${fmt.money(t.parteSeguradora)}</span>` : ''}
          <strong class="num">${fmt.money(t.total)}</strong>
        </div>
      </section>`;
    const f = $('#formItem');
    f.descricao.addEventListener('input', () => {
      const c = db().catalogo.find((x) => x.nome === f.descricao.value);
      if (c) { f.valor.value = c.valor; f.tipo.value = c.tipo; }
    });
    f.onsubmit = (e) => {
      e.preventDefault();
      const d = formDados(f);
      const descricao = d.descricao.trim();
      os.itens.push({ id: PF.uid(), tipo: d.tipo, descricao, qtd: Math.max(1, parseInt(d.qtd, 10) || 1), valor: parseFloat(d.valor) || 0, status: 'aprovado', executorId: d.tipo === 'servico' ? PF.executorPadrao(descricao) : null });
      salvar('Item adicionado.'); render();
      setTimeout(() => $('#formItem [name=descricao]')?.focus(), 0);
    };
  }

  function abaSaida(os, el, { t }) {
    const s = os.saida;
    const pronto = ['pronto', 'entregue'].includes(os.status);
    const docs = '<button class="btn btn--ghost" data-action="doc" data-doc="termo">Termo de entrega</button><button class="btn btn--ghost" data-action="doc" data-doc="garantia">Certificado de garantia</button>';
    el.innerHTML = `
      ${os.status === 'entregue' ? `<div class="aviso ok"><span>Carro entregue em ${fmt.dateTime(os.entrega)}.</span><span class="pg-acoes">${docs}</span></div>`
        : pronto ? `<div class="aviso"><span>Carro pronto. Confira o checklist e registre a entrega quando o cliente retirar.${t.saldo ? ` Saldo a receber: <b>${fmt.money(t.saldo)}</b>.` : ''}</span><span class="pg-acoes">${docs}<button class="btn" data-action="entregar" data-id="${os.id}">Registrar entrega</button></span></div>`
          : '<div class="aviso"><span>A saída é preenchida quando o carro estiver pronto. Você já pode adiantar o checklist.</span></div>'}
      <div class="grade grade-2">
        <section class="bloco"><h2>Checklist de qualidade</h2>
          <div>${PF.CHECK_SAIDA.map((i) => `<label class="check"><input type="checkbox" data-check="saida.checklist" value="${esc(i)}" ${s.checklist[i] ? 'checked' : ''}>${esc(i)}</label>`).join('')}</div></section>
        <section class="bloco"><h2>Dados de saída</h2>
          <div class="grade" style="gap:14px">
            <label class="field"><span>Quilometragem na saída</span><input class="input num" type="number" min="0" value="${s.km || ''}" data-campo="saida.km" data-tipo="int"></label>
            ${os.entrada.km && s.km ? `<p class="nota">Rodou ${(s.km - os.entrada.km).toLocaleString('pt-BR')} km na oficina (testes e manobras).</p>` : ''}
            <label class="field"><span>Observações da entrega</span><textarea class="textarea" data-campo="saida.obs" placeholder="Ex.: orientado a não lavar com produtos ácidos por 7 dias">${esc(s.obs)}</textarea></label>
          </div></section>
      </div>
      <div class="grade grade-2" style="margin-top:16px">
        ${blocoFotos(os, 'saida', 'Fotos de saída')}
        ${blocoAssinatura(os, 'saida', 'Assinatura de retirada', 'O cliente confirma que recebeu o carro com os serviços concluídos.')}
      </div>
      ${antesDepois(os)}`;
    iniciarAssinaturas();
  }
  function antesDepois(os) {
    const antes = os.entrada.fotos[0], depois = os.saida.fotos[0];
    if (!antes || !depois) return antes ? '<section class="bloco" style="margin-top:16px"><h2>Antes e depois</h2><p class="nota">Adicione uma foto de saída para montar o antes e depois. Ele entra no termo de entrega e pode ir para o Instagram.</p></section>' : '';
    return `<section class="bloco" style="margin-top:16px"><h2>Antes e depois <small>primeira foto de entrada e de saída</small></h2>
      <div class="antesdepois"><figure><img src="${antes}" alt="Antes" data-action="ver-foto"><figcaption>Entrada, ${fmt.date(os.entrada.data)}</figcaption></figure><figure><img src="${depois}" alt="Depois" data-action="ver-foto"><figcaption>Entrega${os.entrega ? ', ' + fmt.date(os.entrega) : ''}</figcaption></figure></div></section>`;
  }

  function abaFinanceiro(os, el, { t }) {
    const seg = PF.temSeguradora(os);
    el.innerHTML = `
      ${!PF.aprovada(os) ? '<div class="aviso"><span>O saldo passa a contar como “a receber” depois que o orçamento é aprovado.</span></div>' : ''}
      <div class="kpis">
        <div class="kpi"><span>Valor da OS</span><strong class="num">${fmt.money(t.total)}</strong>${os.desconto ? `<small>Desconto de ${fmt.money(os.desconto)}</small>` : ''}</div>
        <div class="kpi"><span>Recebido</span><strong class="num pos">${fmt.money(t.pago)}</strong><small>${os.pagamentos.length} pagamento(s)</small></div>
        <div class="kpi"><span>Saldo a receber</span><strong class="num ${t.saldo ? 'alerta' : ''}">${fmt.money(t.saldo)}</strong>${seg ? `<small>Cliente ${fmt.money(t.saldoCliente)}, seguradora ${fmt.money(t.saldoSeguradora)}</small>` : ''}</div>
        <div class="kpi"><span>Custos deste carro</span><strong class="num">${fmt.money(t.custo)}</strong><small>Peças, tinta e terceiros</small></div>
        <div class="kpi is-destaque"><span>Margem</span><strong class="num">${fmt.money(t.margem)}</strong><small>${fmt.pct(t.margemPct)} do valor da OS</small></div>
      </div>
      ${seg ? `<div class="kpis kpis--2">
        <div class="kpi"><span>Cliente paga (franquia)</span><strong class="num">${fmt.money(t.parteCliente)}</strong><small>Já pagou ${fmt.money(t.pagoCliente)}</small></div>
        <div class="kpi"><span>${esc(os.seguradora.nome)} paga</span><strong class="num">${fmt.money(t.parteSeguradora)}</strong><small>${PF.AUTORIZACAO[os.seguradora.autorizacao]}. Já pagou ${fmt.money(t.pagoSeguradora)}</small></div>
      </div>` : ''}
      <div class="grade grade-2">
        <section class="bloco"><h2>Pagamentos recebidos <button class="btn btn--sm" data-action="novo-pagamento" data-id="${os.id}">Registrar pagamento</button></h2>
          ${os.pagamentos.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Data</th><th>Forma</th><th class="r">Valor</th><th></th></tr></thead><tbody>
            ${os.pagamentos.map((p) => `<tr><td>${fmt.date(p.data)}${p.obs ? `<span class="sub">${esc(p.obs)}</span>` : ''}</td><td>${esc(p.forma)}</td><td class="r pos">${fmt.money(p.valor)}</td><td class="r"><span class="linha-acoes"><button class="btn btn--sm btn--ghost" data-action="recibo" data-item="${p.id}">Recibo</button><button class="x" data-action="rm-pag" data-item="${p.id}" aria-label="Remover pagamento">×</button></span></td></tr>`).join('')}
          </tbody><tfoot><tr><td colspan="2">Total recebido</td><td class="r">${fmt.money(t.pago)}</td><td></td></tr></tfoot></table></div>` : '<p class="vazio">Nenhum pagamento registrado.</p>'}
        </section>
        <section class="bloco"><h2>Custos do serviço <span class="pg-acoes"><button class="btn btn--sm btn--ghost" data-action="usar-estoque" data-id="${os.id}">Usar do estoque</button><button class="btn btn--sm btn--ghost" data-action="novo-custo" data-id="${os.id}">Lançar custo</button></span></h2>
          ${os.custos.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Data</th><th>Descrição</th><th class="r">Valor</th><th></th></tr></thead><tbody>
            ${os.custos.map((c) => `<tr><td>${fmt.date(c.data)}</td><td>${esc(c.descricao)}<span class="sub">${esc(c.categoria)}${c.movId ? ', saiu do estoque' : ''}</span></td><td class="r neg">${fmt.money(c.valor)}</td><td class="r"><button class="x" data-action="rm-custo" data-item="${c.id}" aria-label="Remover custo">×</button></td></tr>`).join('')}
          </tbody><tfoot><tr><td colspan="2">Total de custos</td><td class="r">${fmt.money(t.custo)}</td><td></td></tr></tfoot></table></div>` : '<p class="vazio">Lance peças, tinta e terceiros, ou use materiais do estoque, para ver a margem deste carro.</p>'}
        </section>
      </div>`;
  }

  function abaHistorico(os, el) {
    const fotos = os.fotosEtapas || [];
    const grupos = PF.FLUXOS[os.fluxo].etapas.map((st) => ({ st, fotos: fotos.filter((f) => f.etapa === st) })).filter((g) => g.fotos.length);
    el.innerHTML = `<div class="grade grade-3-1">
      <div class="grade" style="align-content:start">
        <section class="bloco"><h2>Fotos do andamento <small>cada foto fica marcada com a etapa em que foi tirada</small></h2>
          ${grupos.map((g) => `<h3 class="etapa-tit"><i style="background:${PF.statusOf(g.st).color}"></i>${esc(PF.statusOf(g.st).label)}</h3><div class="fotos">${g.fotos.map((f) => `<div class="foto"><img src="${f.src}" alt="" data-action="ver-foto"><button class="x" data-action="rm-foto-etapa" data-item="${f.id}" aria-label="Remover foto">×</button></div>`).join('')}</div>`).join('')}
          <div class="fotos" ${grupos.length ? 'style="margin-top:16px"' : ''}><label class="foto-add">Fotos de ${esc(PF.statusOf(os.status).label.toLowerCase())}<input type="file" accept="image/*" multiple data-fotos-etapa="1"></label></div>
        </section>
        <section class="bloco"><h2>Linha do tempo</h2>
          <ul class="historico">${os.historico.map((h) => `<li style="--c:${h.status ? PF.statusOf(h.status).color : 'var(--steel)'}"><time>${fmt.dateTime(h.data)}</time>${h.status ? `<b>${esc(PF.statusOf(h.status).label)}</b>` : '<b>Anotação</b>'}${h.nota ? `<div>${esc(h.nota)}</div>` : ''}</li>`).join('')}</ul></section>
      </div>
      <section class="bloco" style="align-self:start"><h2>Nova anotação</h2>
        <form id="formNota" class="grade" style="gap:10px"><textarea class="textarea" name="nota" required placeholder="Ex.: cliente pediu para trocar também o emblema traseiro"></textarea>
        <label class="check"><input type="checkbox" name="publica">Mostrar para o cliente no acompanhamento</label>
        <button class="btn" type="submit">Adicionar anotação</button></form></section></div>`;
    $('#formNota').onsubmit = (e) => {
      e.preventDefault();
      const d = formDados(e.target);
      os.historico.unshift({ id: PF.uid(), data: new Date().toISOString(), status: null, nota: d.nota.trim(), publica: !!d.publica });
      salvar('Anotação adicionada.'); render();
    };
  }

  // ---------- IMPRESSÃO ----------
  function osImprimir(id) {
    const os = PF.find.os(id); if (!os) return;
    const v = veic(os), c = cli(os), t = PF.totais(os);
    titulo(`Imprimir OS ${os.numero}`);
    view.innerHTML = `
      <div class="pg-topo no-print"><div><a class="voltar" href="#/os/${os.id}">‹ Voltar para a OS</a><h1>Ordem de serviço</h1></div><div class="pg-acoes"><button class="btn" onclick="print()">Imprimir ou salvar PDF</button></div></div>
      <article class="doc">
        <header class="doc__cab"><div><img src="assets/img/logo-preto.png" alt="Paint Forza"><p style="margin-top:8px">${esc(db().oficina.endereco)}<br>WhatsApp ${PF.OFICINA.whatsappFmt}, @${PF.OFICINA.instagram}</p></div>
          <div><h1>OS ${os.numero}</h1><p style="text-align:right">Entrada ${fmt.dateTime(os.abertura)}<br>Previsão ${fmt.date(os.previsao)}<br>Código de acompanhamento: <b>${os.codigo}</b></p></div></header>
        <div class="grade grade-2">
          <div><h2>Cliente</h2><dl class="dados"><dt>Nome</dt><dd>${esc(c.nome)}</dd><dt>Telefone</dt><dd>${esc(c.telefone)}</dd><dt>E-mail</dt><dd>${esc(c.email || '—')}</dd></dl></div>
          <div><h2>Veículo</h2><dl class="dados"><dt>Placa</dt><dd>${esc(v.placa)}</dd><dt>Modelo</dt><dd>${esc(nomeCarro(v))} ${v.ano}</dd><dt>Cor</dt><dd>${esc(v.cor)}</dd><dt>Km / comb.</dt><dd>${os.entrada.km ? os.entrada.km.toLocaleString('pt-BR') : '—'} km, ${os.entrada.combustivel}/8</dd></dl></div>
        </div>
        <h2>Relato do cliente</h2><p>${esc(os.relato)}</p>
        <h2>Vistoria de entrada</h2>
        <div class="doc__vistoria"><div>${PF.diagramSVG(os.entrada.avarias)}</div><div class="grade" style="gap:10px">${listaAvarias(os, false)}
          <p><b>Itens no carro:</b> ${PF.ITENS_ENTRADA.filter((i) => os.entrada.itens[i]).map(esc).join(', ') || '—'}</p>${os.entrada.obs ? `<p><b>Obs.:</b> ${esc(os.entrada.obs)}</p>` : ''}</div></div>
        <h2>Serviços e peças</h2>
        <table class="tabela"><thead><tr><th>Descrição</th><th class="r">Qtd.</th><th class="r">Unit.</th><th class="r">Subtotal</th></tr></thead><tbody>
          ${os.itens.map((i) => `<tr><td>${esc(i.descricao)} <span class="tipo ${i.tipo}">${i.tipo === 'peca' ? 'Peça' : 'Serviço'}</span></td><td class="r">${i.qtd}</td><td class="r">${fmt.money(i.valor)}</td><td class="r">${fmt.money(i.qtd * i.valor)}</td></tr>`).join('')}
        </tbody><tfoot>${os.desconto ? `<tr><td colspan="3">Desconto</td><td class="r">− ${fmt.money(os.desconto)}</td></tr>` : ''}<tr><td colspan="3">Total</td><td class="r">${fmt.money(t.total)}</td></tr><tr><td colspan="3">Pago</td><td class="r">${fmt.money(t.pago)}</td></tr><tr><td colspan="3">Saldo</td><td class="r">${fmt.money(Math.max(0, t.total - t.pago))}</td></tr></tfoot></table>
        <div class="doc__assin">
          <div>${os.entrada.assinatura ? `<img src="${os.entrada.assinatura}" alt="">` : ''}Cliente na entrada</div>
          <div>${os.saida.assinatura ? `<img src="${os.saida.assinatura}" alt="">` : ''}Cliente na retirada</div>
        </div>
        <p class="doc__termos">O cliente declara que as avarias acima conferem com o estado do veículo na entrada. Objetos pessoais deixados no veículo são de responsabilidade do proprietário. Garantia de pintura conforme condições informadas no orçamento. Veículos não retirados em até 5 dias após o aviso de conclusão estão sujeitos a cobrança de estadia.</p>
      </article>`;
  }

  // ---------- VEÍCULOS ----------
  function resumoVeiculo(v) {
    const lista = db().os.filter((o) => o.veiculoId === v.id);
    const ts = lista.map(PF.totais);
    return { lista, total: soma(ts.filter((_, i) => PF.aprovada(lista[i])), (t) => t.total), pago: soma(ts, (t) => t.pago), saldo: soma(ts, (t) => t.saldo), custo: soma(ts, (t) => t.custo), ultima: lista.map((o) => o.abertura).sort().pop() };
  }
  function veiculos() {
    titulo('Veículos');
    const q = ui.veicBusca.toLowerCase();
    const lista = db().veiculos.filter((v) => !q || [v.placa, v.marca, v.modelo, v.cor, (PF.find.cliente(v.clienteId) || {}).nome].join(' ').toLowerCase().includes(q))
      .map((v) => ({ v, r: resumoVeiculo(v) })).sort((a, b) => String(b.r.ultima).localeCompare(String(a.r.ultima)));
    view.innerHTML = `
      <div class="pg-topo"><div><h1>Veículos</h1><p>Cada carro tem o histórico de serviços e o financeiro próprio.</p></div></div>
      <div class="filtros"><input class="input" id="fVeic" placeholder="Filtrar por placa, modelo ou dono" value="${esc(ui.veicBusca)}"></div>
      <section class="bloco"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Veículo</th><th>Dono</th><th class="r">OS</th><th class="r">Total em serviços</th><th class="r">Em aberto</th><th>Última visita</th></tr></thead><tbody>
        ${lista.map(({ v, r }) => `<tr data-href="#/veiculos/${v.id}"><td>${carroCel(v)}</td><td>${esc((PF.find.cliente(v.clienteId) || {}).nome)}</td><td class="r">${r.lista.length}</td><td class="r">${fmt.money(r.total)}</td><td class="r ${r.saldo ? 'alerta' : ''}">${r.saldo ? fmt.money(r.saldo) : '—'}</td><td>${fmt.date(r.ultima)}</td></tr>`).join('')}
      </tbody></table></div></section>`;
    const f = $('#fVeic');
    f.oninput = () => { ui.veicBusca = f.value; clearTimeout(f._t); f._t = setTimeout(() => { render(); const n = $('#fVeic'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  }
  function veiculo(id) {
    const v = PF.find.veiculo(id);
    if (!v) { view.innerHTML = '<div class="vazio">Veículo não encontrado. <a href="#/veiculos">Ver veículos</a></div>'; return; }
    const c = PF.find.cliente(v.clienteId) || {};
    const r = resumoVeiculo(v);
    titulo(v.placa);
    const lanc = r.lista.flatMap((os) => [
      ...os.pagamentos.map((p) => ({ data: p.data, desc: `Pagamento (${p.forma})`, os, valor: p.valor })),
      ...os.custos.map((x) => ({ data: x.data, desc: x.descricao, os, valor: -x.valor })),
    ]).sort((a, b) => new Date(b.data) - new Date(a.data));
    view.innerHTML = `
      <a class="voltar" href="#/veiculos">‹ Veículos</a>
      <div class="os-cab">${PF.plate(v.placa, 'xl')}
        <div><h1>${esc(nomeCarro(v))}</h1><p>${v.ano}, <i class="cartao__cor" style="background:${v.corHex}"></i>${esc(v.cor)}. Dono: <a href="#/clientes/${c.id}">${esc(c.nome)}</a></p></div>
        <div class="pg-acoes"><button class="btn btn--ghost" data-action="editar-veiculo" data-id="${v.id}">Editar dados</button><button class="btn btn--tape" data-action="nova-os" data-placa="${esc(v.placa)}">Nova OS para este carro</button></div></div>
      <div class="kpis">
        <div class="kpi"><span>Total em serviços</span><strong class="num">${fmt.money(r.total)}</strong><small>${r.lista.length} ordem(ns) de serviço</small></div>
        <div class="kpi"><span>Recebido</span><strong class="num pos">${fmt.money(r.pago)}</strong></div>
        <div class="kpi"><span>Em aberto</span><strong class="num ${r.saldo ? 'alerta' : ''}">${fmt.money(r.saldo)}</strong></div>
        <div class="kpi"><span>Custos</span><strong class="num">${fmt.money(r.custo)}</strong></div>
        <div class="kpi is-destaque"><span>Margem com este carro</span><strong class="num">${fmt.money(r.total - r.custo)}</strong><small>${fmt.pct(r.total ? (r.total - r.custo) / r.total : 0)}</small></div>
      </div>
      <div class="grade grade-3-1">
        <section class="bloco"><h2>Ordens de serviço</h2>
          <div class="tabela-wrap"><table class="tabela"><thead><tr><th>OS</th><th>Entrada</th><th>Serviços</th><th>Etapa</th><th class="r">Total</th><th class="r">Saldo</th></tr></thead><tbody>
          ${r.lista.map((os) => { const t = PF.totais(os); return `<tr data-href="#/os/${os.id}"><td><b>${os.numero}</b></td><td>${fmt.date(os.abertura)}</td><td>${esc(os.itens.map((i) => i.descricao).slice(0, 2).join(', '))}${os.itens.length > 2 ? ` e mais ${os.itens.length - 2}` : ''}</td><td>${PF.chip(os.status)}</td><td class="r">${fmt.money(t.total)}</td><td class="r ${t.saldo ? 'alerta' : ''}">${t.saldo ? fmt.money(t.saldo) : '—'}</td></tr>`; }).join('')}
          </tbody></table></div></section>
        <section class="bloco" style="align-self:start"><h2>Lançamentos deste carro</h2>
          ${lanc.length ? `<div class="tabela-wrap"><table class="tabela"><tbody>${lanc.slice(0, 14).map((l) => `<tr><td>${fmt.date(l.data)}<span class="sub">OS ${l.os.numero}: ${esc(l.desc)}</span></td><td class="r ${l.valor > 0 ? 'pos' : 'neg'}">${l.valor > 0 ? '+' : '−'} ${fmt.money(Math.abs(l.valor))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Nenhum lançamento.</p>'}
        </section>
      </div>`;
  }

  // ---------- CLIENTES ----------
  function clientes() {
    titulo('Clientes');
    const q = ui.cliBusca.toLowerCase();
    const lista = db().clientes.filter((c) => !q || [c.nome, c.telefone, c.email].join(' ').toLowerCase().includes(q)).sort((a, b) => a.nome.localeCompare(b.nome));
    view.innerHTML = `
      <div class="pg-topo"><div><h1>Clientes</h1><p>${db().clientes.length} clientes cadastrados</p></div><div class="pg-acoes"><button class="btn btn--ghost" data-action="novo-cliente">Novo cliente</button></div></div>
      <div class="filtros"><input class="input" id="fCli" placeholder="Filtrar por nome, telefone ou e-mail" value="${esc(ui.cliBusca)}"></div>
      <section class="bloco"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Cliente</th><th>Telefone</th><th>Veículos</th><th class="r">Total em serviços</th><th class="r">Em aberto</th></tr></thead><tbody>
        ${lista.map((c) => { const vs = db().veiculos.filter((v) => v.clienteId === c.id); const oss = db().os.filter((o) => o.clienteId === c.id); const ts = oss.map(PF.totais); return `<tr data-href="#/clientes/${c.id}"><td><b>${esc(c.nome)}</b><span class="sub">${c.tipo === 'PJ' ? 'Empresa' : 'Pessoa física'}, ${oss.length} OS</span></td><td>${esc(c.telefone)}</td><td><span style="display:flex;gap:6px;flex-wrap:wrap">${vs.map((v) => PF.plate(v.placa)).join('')}</span></td><td class="r">${fmt.money(soma(ts.filter((_, i) => PF.aprovada(oss[i])), (t) => t.total))}</td><td class="r">${soma(ts, (t) => t.saldo) ? `<span class="alerta">${fmt.money(soma(ts, (t) => t.saldo))}</span>` : '—'}</td></tr>`; }).join('')}
      </tbody></table></div></section>`;
    const f = $('#fCli');
    f.oninput = () => { ui.cliBusca = f.value; clearTimeout(f._t); f._t = setTimeout(() => { render(); const n = $('#fCli'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  }
  function cliente(id) {
    const c = PF.find.cliente(id);
    if (!c) { view.innerHTML = '<div class="vazio">Cliente não encontrado. <a href="#/clientes">Ver clientes</a></div>'; return; }
    titulo(c.nome);
    const vs = db().veiculos.filter((v) => v.clienteId === c.id);
    const oss = db().os.filter((o) => o.clienteId === c.id);
    const ts = oss.map(PF.totais);
    view.innerHTML = `
      <a class="voltar" href="#/clientes">‹ Clientes</a>
      <div class="pg-topo"><div><h1>${esc(c.nome)}</h1><p>${c.tipo === 'PJ' ? 'Empresa' : 'Pessoa física'}, cliente desde ${fmt.date(c.criadoEm)}</p></div>
        <div class="pg-acoes"><a class="btn btn--ghost" target="_blank" rel="noopener" href="${PF.waLink(c.telefone, `Olá, ${primeiroNome(c)}! Aqui é da Paint Forza.`)}">${ICON_ZAP}WhatsApp</a><button class="btn btn--ghost" data-action="editar-cliente" data-id="${c.id}">Editar</button></div></div>
      <div class="kpis">
        <div class="kpi"><span>Total em serviços</span><strong class="num">${fmt.money(soma(ts.filter((_, i) => PF.aprovada(oss[i])), (t) => t.total))}</strong></div>
        <div class="kpi"><span>Recebido</span><strong class="num pos">${fmt.money(soma(ts, (t) => t.pago))}</strong></div>
        <div class="kpi"><span>Em aberto</span><strong class="num">${fmt.money(soma(ts, (t) => t.saldo))}</strong></div>
        <div class="kpi"><span>Ordens de serviço</span><strong class="num">${oss.length}</strong></div>
      </div>
      <div class="grade grade-1-2">
        <div class="grade" style="align-content:start">
          <section class="bloco"><h2>Contato</h2><dl class="dados"><dt>Telefone</dt><dd>${esc(c.telefone)}</dd><dt>E-mail</dt><dd>${esc(c.email || '—')}</dd></dl></section>
          <section class="bloco"><h2>Veículos</h2>${vs.map((v) => `<a href="#/veiculos/${v.id}" style="display:block;text-decoration:none;padding:8px 0;border-bottom:1px solid var(--line)">${carroCel(v)}</a>`).join('') || '<p class="nota">Nenhum veículo.</p>'}</section>
        </div>
        <section class="bloco" style="align-self:start"><h2>Ordens de serviço</h2>
          <div class="tabela-wrap"><table class="tabela"><thead><tr><th>OS</th><th>Carro</th><th>Entrada</th><th>Etapa</th><th class="r">Total</th><th class="r">Saldo</th></tr></thead><tbody>
          ${oss.map((os, i) => `<tr data-href="#/os/${os.id}"><td><b>${os.numero}</b></td><td>${PF.plate(veic(os).placa)}</td><td>${fmt.date(os.abertura)}</td><td>${PF.chip(os.status)}</td><td class="r">${fmt.money(ts[i].total)}</td><td class="r ${ts[i].saldo ? 'alerta' : ''}">${ts[i].saldo ? fmt.money(ts[i].saldo) : '—'}</td></tr>`).join('')}
          </tbody></table></div></section>
      </div>`;
  }

  // ---------- FINANCEIRO ----------
  const FIN_ABAS = [['geral', 'Visão geral'], ['veiculos', 'Por veículo'], ['lancamentos', 'Lançamentos'], ['despesas', 'Despesas da oficina'], ['equipe', 'Equipe e comissões']];
  const PERIODOS = [['mes', 'Este mês'], ['3m', '3 meses'], ['6m', '6 meses'], ['tudo', 'Tudo']];
  function financeiro(aba = 'geral') {
    titulo('Financeiro');
    view.innerHTML = `
      <div class="pg-topo"><div><h1>Financeiro</h1><p>Cada entrada e cada custo fica ligado ao carro e à OS de origem.</p></div>
        <div class="seg" role="group" aria-label="Período">${PERIODOS.map(([k, l]) => `<button type="button" data-action="periodo" data-v="${k}" aria-pressed="${ui.periodo === k}">${l}</button>`).join('')}</div></div>
      <nav class="abas">${FIN_ABAS.map(([k, l]) => `<a href="#/financeiro/${k}" class="${k === aba ? 'is-ativa' : ''}">${l}</a>`).join('')}</nav>
      <div id="aba"></div>`;
    ({ geral: finGeral, veiculos: finVeiculos, lancamentos: finLancamentos, despesas: finDespesas, equipe: finEquipe }[aba] || finGeral)($('#aba'));
  }
  function finGeral(el) {
    const pags = todosPagamentos().filter((p) => noPeriodo(p.data));
    const custos = todosCustos().filter((c) => noPeriodo(c.data));
    const desp = db().despesas.filter((d) => noPeriodo(d.data));
    const recebido = soma(pags, (p) => p.valor);
    const saidas = soma(custos, (c) => c.valor) + soma(desp, (d) => d.valor);
    const entregues = db().os.filter((o) => o.status === 'entregue' && noPeriodo(o.entrega));
    const ticket = entregues.length ? soma(entregues, (o) => PF.totais(o).total) / entregues.length : 0;
    const receber = db().os.filter((o) => PF.totais(o).saldo > 0).sort((a, b) => PF.totais(b).saldo - PF.totais(a).saldo);
    const porForma = PF.FORMAS.map((f) => ({ f, v: soma(pags.filter((p) => p.forma === f), (p) => p.valor) })).filter((x) => x.v).sort((a, b) => b.v - a.v);
    const maxForma = Math.max(1, ...porForma.map((x) => x.v));
    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Recebido</span><strong class="num pos">${fmt.money(recebido)}</strong><small>${pags.length} pagamentos</small></div>
        <div class="kpi"><span>Despesas</span><strong class="num neg">${fmt.money(saidas)}</strong><small>Custos dos carros e da oficina</small></div>
        <div class="kpi is-destaque"><span>Resultado</span><strong class="num ${recebido - saidas >= 0 ? 'pos' : 'neg'}">${fmt.money(recebido - saidas)}</strong><small>Recebido menos despesas</small></div>
        <div class="kpi"><span>A receber agora</span><strong class="num alerta">${fmt.money(soma(receber, (o) => PF.totais(o).saldo))}</strong><small>${receber.length} OS com saldo</small></div>
        <div class="kpi"><span>A receber de seguradoras</span><strong class="num">${fmt.money(soma(db().os, (o) => PF.totais(o).saldoSeguradora))}</strong><small>${db().os.filter((o) => PF.totais(o).saldoSeguradora > 0).length} sinistro(s) em aberto</small></div>
        <div class="kpi"><span>Ticket médio</span><strong class="num">${fmt.money(ticket)}</strong><small>${entregues.length} carros entregues</small></div>
      </div>
      <div class="grade grade-3-1">
        <section class="bloco"><h2>Recebido e despesas <small>últimos 6 meses</small></h2>${grafico(serieMensal())}</section>
        <section class="bloco"><h2>Por forma de pagamento</h2>
          ${porForma.length ? porForma.map((x) => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:15px"><span>${esc(x.f)}</span><b class="num">${fmt.money(x.v)}</b></div><div class="barra-margem" style="margin-top:4px"><span style="width:${(x.v / maxForma) * 100}%"></span></div></div>`).join('') : '<p class="vazio">Sem pagamentos no período.</p>'}</section>
      </div>
      <section class="bloco" style="margin-top:20px"><h2>Contas a receber <small>OS aprovadas com saldo</small></h2>
        ${receber.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Carro</th><th>Cliente</th><th>Etapa</th><th class="r">Total</th><th class="r">Recebido</th><th class="r">Saldo</th><th></th></tr></thead><tbody>
        ${receber.map((os) => { const t = PF.totais(os), c = cli(os); return `<tr data-href="#/os/${os.id}/financeiro"><td>${carroCel(veic(os), 'OS ' + os.numero)}</td><td>${esc(c.nome)}${PF.temSeguradora(os) ? `<span class="sub">Cliente ${fmt.money(t.saldoCliente)}, ${esc(os.seguradora.nome)} ${fmt.money(t.saldoSeguradora)}</span>` : ''}</td><td>${PF.chip(os.status)}</td><td class="r">${fmt.money(t.total)}</td><td class="r">${fmt.money(t.pago)}</td><td class="r alerta"><b>${fmt.money(t.saldo)}</b></td><td class="r"><a class="btn btn--sm btn--ghost" target="_blank" rel="noopener" href="${PF.waLink(c.telefone, `Olá, ${primeiroNome(c)}! Aqui é da Paint Forza. Consta um saldo de ${fmt.money(PF.temSeguradora(os) ? t.saldoCliente : t.saldo)} referente à OS ${os.numero} (${nomeCarro(veic(os))}). Pode pagar por Pix ou na retirada. Detalhes: ${PF.portalUrl(os)}`)}">${ICON_ZAP}Cobrar</a></td></tr>`; }).join('')}
        </tbody></table></div>` : '<p class="vazio">Nenhum valor em aberto.</p>'}
      </section>`;
  }
  function finVeiculos(el) {
    const oss = db().os.filter((o) => PF.aprovada(o) && noPeriodo(o.abertura));
    const mapa = new Map();
    oss.forEach((os) => {
      const t = PF.totais(os);
      const r = mapa.get(os.veiculoId) || { v: veic(os), n: 0, total: 0, pago: 0, saldo: 0, custo: 0 };
      r.n++; r.total += t.total; r.pago += t.pago; r.saldo += t.saldo; r.custo += t.custo;
      mapa.set(os.veiculoId, r);
    });
    const ordem = { faturado: (a, b) => b.total - a.total, margem: (a, b) => (b.total - b.custo) - (a.total - a.custo), aberto: (a, b) => b.saldo - a.saldo };
    const linhas = [...mapa.values()].sort(ordem[ui.veicOrdem]);
    const tot = linhas.reduce((s, r) => ({ total: s.total + r.total, pago: s.pago + r.pago, saldo: s.saldo + r.saldo, custo: s.custo + r.custo }), { total: 0, pago: 0, saldo: 0, custo: 0 });
    el.innerHTML = `
      <div class="filtros"><label class="field" style="flex-direction:row"><span>Ordenar por</span><select class="select" id="fOrdem"><option value="faturado">Maior faturamento</option><option value="margem">Maior margem</option><option value="aberto">Maior valor em aberto</option></select></label></div>
      <section class="bloco"><h2>Resultado por veículo <small>OS aprovadas abertas no período</small></h2>
        ${linhas.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Veículo</th><th>Dono</th><th class="r">OS</th><th class="r">Faturado</th><th class="r">Recebido</th><th class="r">Em aberto</th><th class="r">Custos</th><th class="r">Margem</th><th></th></tr></thead><tbody>
        ${linhas.map((r) => { const m = r.total - r.custo, pct = r.total ? m / r.total : 0; return `<tr data-href="#/veiculos/${r.v.id}"><td>${carroCel(r.v)}</td><td>${esc((PF.find.cliente(r.v.clienteId) || {}).nome)}</td><td class="r">${r.n}</td><td class="r">${fmt.money(r.total)}</td><td class="r">${fmt.money(r.pago)}</td><td class="r ${r.saldo ? 'alerta' : ''}">${r.saldo ? fmt.money(r.saldo) : '—'}</td><td class="r">${fmt.money(r.custo)}</td><td class="r"><b>${fmt.money(m)}</b><span class="sub">${fmt.pct(pct)}</span></td><td><div class="barra-margem"><span style="width:${Math.max(0, pct) * 100}%"></span></div></td></tr>`; }).join('')}
        </tbody><tfoot><tr><td colspan="3">Total</td><td class="r">${fmt.money(tot.total)}</td><td class="r">${fmt.money(tot.pago)}</td><td class="r">${fmt.money(tot.saldo)}</td><td class="r">${fmt.money(tot.custo)}</td><td class="r">${fmt.money(tot.total - tot.custo)}</td><td></td></tr></tfoot></table></div>` : '<p class="vazio">Nenhuma OS aprovada no período.</p>'}
      </section>`;
    $('#fOrdem').value = ui.veicOrdem;
    $('#fOrdem').onchange = (e) => { ui.veicOrdem = e.target.value; render(); };
  }
  function finLancamentos(el) {
    const linhas = [
      ...todosPagamentos().map((p) => ({ data: p.data, tipo: 'entrada', desc: `Pagamento OS ${p.os.numero} (${p.forma})`, sub: p.obs, carro: veic(p.os), href: `#/os/${p.os.id}/financeiro`, valor: p.valor })),
      ...todosCustos().map((c) => ({ data: c.data, tipo: 'saida', desc: c.descricao, sub: `${c.categoria}, OS ${c.os.numero}`, carro: veic(c.os), href: `#/os/${c.os.id}/financeiro`, valor: -c.valor })),
      ...db().despesas.map((d) => ({ data: d.data, tipo: 'saida', desc: d.descricao, sub: `${d.categoria}${d.pago ? '' : ', a pagar'}`, carro: null, href: '#/financeiro/despesas', valor: -d.valor })),
    ].filter((l) => noPeriodo(l.data) && (ui.lancTipo === 'todos' || l.tipo === ui.lancTipo)).sort((a, b) => new Date(b.data) - new Date(a.data));
    const ent = soma(linhas.filter((l) => l.valor > 0), (l) => l.valor), sai = soma(linhas.filter((l) => l.valor < 0), (l) => -l.valor);
    el.innerHTML = `
      <div class="filtros"><div class="seg" role="group" aria-label="Tipo de lançamento">${[['todos', 'Todos'], ['entrada', 'Entradas'], ['saida', 'Saídas']].map(([k, l]) => `<button type="button" data-action="lanc-tipo" data-v="${k}" aria-pressed="${ui.lancTipo === k}">${l}</button>`).join('')}</div></div>
      <section class="bloco"><h2>Lançamentos <small>${linhas.length} no período</small></h2>
        ${linhas.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Data</th><th>Descrição</th><th>Carro</th><th class="r">Valor</th></tr></thead><tbody>
        ${linhas.slice(0, 300).map((l) => `<tr data-href="${l.href}"><td>${fmt.date(l.data)}</td><td>${esc(l.desc)}${l.sub ? `<span class="sub">${esc(l.sub)}</span>` : ''}</td><td>${l.carro ? PF.plate(l.carro.placa) : '<span class="nota">Oficina</span>'}</td><td class="r ${l.valor > 0 ? 'pos' : 'neg'}">${l.valor > 0 ? '+' : '−'} ${fmt.money(Math.abs(l.valor))}</td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="3">Entradas ${fmt.money(ent)}, saídas ${fmt.money(sai)}</td><td class="r">${fmt.money(ent - sai)}</td></tr></tfoot></table></div>` : '<p class="vazio">Nenhum lançamento no período.</p>'}
      </section>`;
  }
  function finDespesas(el) {
    const lista = db().despesas.filter((d) => noPeriodo(d.data)).sort((a, b) => new Date(b.data) - new Date(a.data));
    const pagas = soma(lista.filter((d) => d.pago), (d) => d.valor), apagar = soma(lista.filter((d) => !d.pago), (d) => d.valor);
    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Despesas no período</span><strong class="num">${fmt.money(pagas + apagar)}</strong></div>
        <div class="kpi"><span>Pagas</span><strong class="num">${fmt.money(pagas)}</strong></div>
        <div class="kpi"><span>A pagar</span><strong class="num alerta">${fmt.money(apagar)}</strong></div>
      </div>
      <section class="bloco"><h2>Despesas da oficina <small>gastos que não são de um carro específico</small><button class="btn btn--sm" data-action="nova-despesa">Nova despesa</button></h2>
        ${lista.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th class="r">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
        ${lista.map((d) => `<tr><td>${fmt.date(d.data)}</td><td>${esc(d.descricao)}</td><td>${esc(d.categoria)}</td><td class="r">${fmt.money(d.valor)}</td><td><button class="btn btn--sm ${d.pago ? 'btn--ghost' : 'btn--tape'}" data-action="toggle-despesa" data-item="${d.id}">${d.pago ? 'Paga' : 'Marcar como paga'}</button></td><td class="r"><button class="x" data-action="rm-despesa" data-item="${d.id}" aria-label="Remover despesa">×</button></td></tr>`).join('')}
        </tbody></table></div>` : '<p class="vazio">Nenhuma despesa no período.</p>'}
      </section>`;
  }

  function finEquipe(el) {
    const oss = db().os.filter((o) => PF.aprovada(o) && noPeriodo(o.entrega || o.abertura));
    const linhas = (db().equipe || []).map((m) => {
      const its = oss.flatMap((os) => os.itens.filter((i) => PF.itemAtivo(i) && i.executorId === m.id).map((i) => ({ i, os })));
      const valor = soma(its, (x) => x.i.qtd * x.i.valor);
      return { m, servicos: its.length, carros: new Set(its.map((x) => x.os.veiculoId)).size, valor, comissao: (valor * (m.comissao || 0)) / 100 };
    }).sort((a, b) => b.valor - a.valor);
    const max = Math.max(1, ...linhas.map((l) => l.valor));
    const semDono = soma(oss.flatMap((os) => os.itens.filter((i) => PF.itemAtivo(i) && i.tipo === 'servico' && !i.executorId)), (i) => i.qtd * i.valor);
    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Produzido pela equipe</span><strong class="num">${fmt.money(soma(linhas, (l) => l.valor))}</strong><small>Serviços aprovados no período</small></div>
        <div class="kpi is-destaque"><span>Comissões a pagar</span><strong class="num">${fmt.money(soma(linhas, (l) => l.comissao))}</strong><small>Pelo percentual de cada profissional</small></div>
        <div class="kpi"><span>Serviços sem responsável</span><strong class="num ${semDono ? 'alerta' : ''}">${fmt.money(semDono)}</strong><small>Defina na aba Serviços da OS</small></div>
      </div>
      <section class="bloco"><h2>Produção e comissão por profissional <a class="btn btn--sm btn--ghost" href="#/config">Editar equipe</a></h2>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Profissional</th><th class="r">Serviços</th><th class="r">Carros</th><th class="r">Produzido</th><th></th><th class="r">Comissão</th></tr></thead><tbody>
        ${linhas.map((l) => `<tr><td><b>${esc(l.m.nome)}</b><span class="sub">${esc(l.m.funcao)}, ${l.m.comissao}%</span></td><td class="r">${l.servicos}</td><td class="r">${l.carros}</td><td class="r">${fmt.money(l.valor)}</td><td style="width:22%"><div class="barra-margem"><span style="width:${(l.valor / max) * 100}%"></span></div></td><td class="r"><b>${fmt.money(l.comissao)}</b></td></tr>`).join('')}
        </tbody></table></div></section>`;
  }

  // ---------- AJUSTES ----------
  function config() {
    titulo('Ajustes');
    const o = db().oficina;
    let usado = 0; try { usado = (localStorage.getItem(PF.KEY) || '').length * 2; } catch (e) { /* sem acesso */ }
    view.innerHTML = `
      <div class="pg-topo"><div><h1>Ajustes</h1></div></div>
      <div class="grade grade-2">
        <section class="bloco"><h2>Dados da oficina</h2>
          <form id="formOficina" class="grade" style="gap:12px">
            <label class="field"><span>Nome</span><input class="input" name="nome" value="${esc(o.nome)}"></label>
            <label class="field"><span>Endereço</span><input class="input" name="endereco" value="${esc(o.endereco)}"></label>
            <label class="field"><span>Horário</span><input class="input" name="horario" value="${esc(o.horario)}"></label>
            <button class="btn" type="submit" style="justify-self:start">Salvar dados</button>
          </form></section>
        <section class="bloco"><h2>Tabela de serviços <small>sugestões de preço ao montar o orçamento</small></h2>
          <div class="tabela-wrap"><table class="tabela"><tbody>${db().catalogo.map((c) => `<tr><td>${esc(c.nome)}</td><td class="r" style="width:150px"><input class="input num" type="number" min="0" step="10" value="${c.valor}" data-catalogo="${c.id}" aria-label="Preço de ${esc(c.nome)}"></td><td class="r"><button class="x" data-action="rm-catalogo" data-item="${c.id}" aria-label="Remover">×</button></td></tr>`).join('')}</tbody></table></div>
          <form id="formCatalogo" class="linha-form" style="grid-template-columns:1fr 140px auto"><input class="input" name="nome" required placeholder="Novo serviço"><input class="input" name="valor" type="number" min="0" step="10" required placeholder="Preço"><button class="btn" type="submit">Adicionar</button></form>
        </section>
        <section class="bloco"><h2>Dados da demonstração</h2>
          <p class="nota" style="margin-bottom:14px">Tudo o que você cadastra fica salvo neste navegador (${(usado / 1024).toFixed(0)} KB usados). Na versão final, os dados ficam num servidor seguro e aparecem em qualquer aparelho.</p>
          <div class="pg-acoes"><button class="btn btn--ghost" data-action="backup">Baixar cópia dos dados</button><button class="btn btn--danger" data-action="reset">Restaurar dados de exemplo</button></div></section>
        <section class="bloco"><h2>Equipe <small>quem executa cada serviço e comissões</small></h2>
          <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Nome</th><th>Função</th><th class="r">Comissão %</th><th></th></tr></thead><tbody>${(db().equipe || []).map((m) => `<tr><td><input class="input" value="${esc(m.nome)}" data-equipe="${m.id}|nome" aria-label="Nome"></td><td><input class="input" value="${esc(m.funcao)}" data-equipe="${m.id}|funcao" aria-label="Função"></td><td class="r" style="width:110px"><input class="input num" type="number" min="0" max="50" step="0.5" value="${m.comissao}" data-equipe="${m.id}|comissao" aria-label="Comissão de ${esc(m.nome)}"></td><td class="r"><button class="x" data-action="rm-membro" data-item="${m.id}" aria-label="Remover ${esc(m.nome)}">×</button></td></tr>`).join('')}</tbody></table></div>
          <form id="formMembro" class="linha-form" style="grid-template-columns:1fr 1fr 80px auto"><input class="input" name="nome" required placeholder="Nome"><input class="input" name="funcao" required placeholder="Função"><input class="input" name="comissao" type="number" min="0" step="0.5" placeholder="%"><button class="btn" type="submit">Adicionar</button></form>
        </section>
        <section class="bloco"><h2>Prazos de garantia <small>usados no certificado</small></h2>
          <p class="nota" style="margin-bottom:10px">Cada serviço recebe o prazo da primeira palavra da lista que aparecer na descrição dele.</p>
          <div class="tabela-wrap"><table class="tabela"><tbody>${db().garantias.map((g, i) => `<tr><td>Serviços com “${esc(g.chave)}”</td><td class="r" style="width:130px"><input class="input num" type="number" min="0" step="1" value="${g.meses}" data-garantia="${i}" aria-label="Meses de garantia para ${esc(g.chave)}"></td><td class="nota" style="width:60px">meses</td></tr>`).join('')}</tbody></table></div>
        </section>
      </div>`;
    $('#formMembro').onsubmit = (e) => { e.preventDefault(); const d = formDados(e.target); db().equipe.push({ id: PF.uid(), nome: d.nome.trim(), funcao: d.funcao.trim(), comissao: parseFloat(d.comissao) || 0 }); salvar('Profissional adicionado.'); render(); };
    $('#formOficina').onsubmit = (e) => { e.preventDefault(); Object.assign(db().oficina, formDados(e.target)); salvar('Dados da oficina salvos.'); };
    $('#formCatalogo').onsubmit = (e) => { e.preventDefault(); const d = formDados(e.target); db().catalogo.push({ id: PF.uid(), nome: d.nome.trim(), tipo: 'servico', valor: parseFloat(d.valor) || 0 }); salvar('Serviço adicionado à tabela.'); render(); };
  }

  // ---------- ESTOQUE ----------
  const qtdFmt = (q) => Number(q).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  function situacaoEstoque(e) {
    if (e.qtd <= 0) return { label: 'Zerado', cor: '#C8382E', ordem: 0 };
    if (e.qtd < e.minimo) return { label: 'Abaixo do mínimo', cor: '#C9A227', ordem: 1 };
    return { label: 'Em dia', cor: '#23864E', ordem: 2 };
  }
  const abaixoMinimo = () => db().estoque.filter((e) => e.qtd < e.minimo);
  function estoque() {
    titulo('Estoque');
    const itens = db().estoque;
    const baixo = abaixoMinimo();
    const mesIni = inicioPeriodo('mes');
    const consumo = soma(db().movEstoque.filter((m) => m.tipo === 'saida' && new Date(m.data) >= mesIni), (m) => m.qtd * m.custoUnit);
    const q = ui.estBusca.trim().toLowerCase();
    const lista = itens.filter((e) => (ui.estCat === 'todas' || e.categoria === ui.estCat) && (!ui.estBaixo || e.qtd < e.minimo) && (!q || [e.nome, e.categoria, e.fornecedor].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => situacaoEstoque(a).ordem - situacaoEstoque(b).ordem || a.nome.localeCompare(b.nome));
    view.innerHTML = `
      <div class="pg-topo"><div><h1>Estoque</h1><p>Materiais da oficina. O que sai para uma OS entra no custo daquele carro.</p></div>
        <div class="pg-acoes"><button class="btn btn--ghost" data-action="est-compras">Lista de compras${baixo.length ? ` (${baixo.length})` : ''}</button><button class="btn btn--ghost" data-action="est-saida-livre">Registrar saída</button><button class="btn" data-action="est-novo">Novo item</button></div></div>
      <div class="kpis">
        <div class="kpi"><span>Itens cadastrados</span><strong class="num">${itens.length}</strong><small>${new Set(itens.map((e) => e.categoria)).size} categorias</small></div>
        <div class="kpi is-destaque"><span>Valor em estoque</span><strong class="num">${fmt.money(soma(itens, (e) => e.qtd * e.custo))}</strong><small>Pelo custo médio de compra</small></div>
        <a class="kpi" href="#/estoque" data-action="est-filtro-baixo"><span>Abaixo do mínimo</span><strong class="num ${baixo.length ? 'alerta' : ''}">${baixo.length}</strong><small>${baixo.filter((e) => e.qtd <= 0).length} zerado(s)</small></a>
        <div class="kpi"><span>Consumo no mês</span><strong class="num">${fmt.money(consumo)}</strong><small>Saídas registradas</small></div>
      </div>
      <div class="filtros">
        <input class="input" id="fEst" placeholder="Buscar item ou fornecedor" value="${esc(ui.estBusca)}">
        <select class="select" id="fEstCat"><option value="todas">Todas as categorias</option>${PF.CAT_ESTOQUE.map((c) => `<option ${c === ui.estCat ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <label class="check"><input type="checkbox" id="fEstBaixo" ${ui.estBaixo ? 'checked' : ''}>Só abaixo do mínimo</label>
      </div>
      <section class="bloco">
        ${lista.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Item</th><th>Categoria</th><th>Quantidade</th><th class="r">Mínimo</th><th class="r">Custo médio</th><th class="r">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
        ${lista.map((e) => { const st = situacaoEstoque(e); return `<tr data-href="#/estoque/${e.id}"><td><b>${esc(e.nome)}</b><span class="sub">${esc(e.fornecedor || '')}</span></td><td>${esc(e.categoria)}</td>
          <td><div class="qtd-est"><span class="num">${qtdFmt(e.qtd)} ${esc(e.unidade)}</span><span class="barra-margem"><span style="width:${Math.min(100, (e.qtd / Math.max(e.minimo * 2, 0.01)) * 100)}%;background:${st.cor}"></span></span></div></td>
          <td class="r">${qtdFmt(e.minimo)}</td><td class="r">${fmt.money(e.custo)}</td><td class="r">${fmt.money(e.qtd * e.custo)}</td>
          <td><span class="chip" style="--c:${st.cor}">${st.label}</span></td>
          <td class="r"><span class="linha-acoes"><button class="btn btn--sm btn--ghost" data-action="est-entrada" data-item="${e.id}">Entrada</button><button class="btn btn--sm btn--ghost" data-action="est-saida" data-item="${e.id}" ${e.qtd <= 0 ? 'disabled' : ''}>Saída</button></span></td></tr>`; }).join('')}
        </tbody></table></div>` : '<div class="vazio">Nenhum item com esses filtros.</div>'}
      </section>`;
    const fb = $('#fEst');
    fb.oninput = () => { ui.estBusca = fb.value; clearTimeout(fb._t); fb._t = setTimeout(() => { render(); const n = $('#fEst'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
    $('#fEstCat').onchange = (e) => { ui.estCat = e.target.value; render(); };
    $('#fEstBaixo').onchange = (e) => { ui.estBaixo = e.target.checked; render(); };
  }
  function estoqueItem(id) {
    const e = PF.find.estoque(id);
    if (!e) { view.innerHTML = '<div class="vazio">Item não encontrado. <a href="#/estoque">Ver estoque</a></div>'; return; }
    titulo(e.nome);
    const st = situacaoEstoque(e);
    const movs = db().movEstoque.filter((m) => m.itemId === e.id).sort((a, b) => new Date(b.data) - new Date(a.data));
    const TIPO = { entrada: ['Entrada', '#23864E'], saida: ['Saída', '#2F62C9'], ajuste: ['Ajuste', '#8E9196'] };
    view.innerHTML = `
      <a class="voltar" href="#/estoque">‹ Estoque</a>
      <div class="pg-topo"><div><h1>${esc(e.nome)}</h1><p>${esc(e.categoria)}${e.fornecedor ? `, ${esc(e.fornecedor)}` : ''}${e.local ? `. Fica em: ${esc(e.local)}` : ''}</p></div>
        <div class="pg-acoes"><button class="btn btn--ghost" data-action="est-editar" data-item="${e.id}">Editar</button><button class="btn btn--ghost" data-action="est-ajuste" data-item="${e.id}">Ajustar contagem</button><button class="btn btn--ghost" data-action="est-saida" data-item="${e.id}" ${e.qtd <= 0 ? 'disabled' : ''}>Registrar saída</button><button class="btn" data-action="est-entrada" data-item="${e.id}">Registrar entrada</button></div></div>
      <div class="kpis">
        <div class="kpi"><span>Em estoque</span><strong class="num">${qtdFmt(e.qtd)} ${esc(e.unidade)}</strong><small><span class="chip" style="--c:${st.cor}">${st.label}</span></small></div>
        <div class="kpi"><span>Estoque mínimo</span><strong class="num">${qtdFmt(e.minimo)} ${esc(e.unidade)}</strong></div>
        <div class="kpi"><span>Custo médio</span><strong class="num">${fmt.money(e.custo)}</strong><small>por ${esc(e.unidade)}</small></div>
        <div class="kpi is-destaque"><span>Valor em estoque</span><strong class="num">${fmt.money(e.qtd * e.custo)}</strong></div>
      </div>
      <section class="bloco"><h2>Movimentações <small>${movs.length}</small></h2>
        ${movs.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Data</th><th>Tipo</th><th class="r">Quantidade</th><th class="r">Custo unit.</th><th>OS</th><th>Observação</th></tr></thead><tbody>
        ${movs.map((m) => { const os = m.osId && PF.find.os(m.osId); const [lb, cor] = TIPO[m.tipo]; const menos = m.tipo === 'saida' || m.qtd < 0; return `<tr ${os ? `data-href="#/os/${os.id}/financeiro"` : ''}><td>${fmt.date(m.data)}</td><td><span class="chip" style="--c:${cor}">${lb}</span></td><td class="r ${menos ? 'neg' : 'pos'}">${menos ? '−' : '+'} ${qtdFmt(Math.abs(m.qtd))} ${esc(e.unidade)}</td><td class="r">${fmt.money(m.custoUnit)}</td><td>${os ? `<span class="carro-cel">${PF.plate(veic(os).placa)}<span class="nota">OS ${os.numero}</span></span>` : '<span class="nota">—</span>'}</td><td>${esc(m.obs || '')}</td></tr>`; }).join('')}
        </tbody></table></div>` : '<p class="vazio">Nenhuma movimentação ainda.</p>'}
      </section>`;
  }
  function formItemEstoque(item) {
    const novo = !item;
    const e = item || { nome: '', categoria: PF.CAT_ESTOQUE[0], unidade: 'un', qtd: 0, minimo: 1, custo: 0, fornecedor: '', local: '' };
    modal(`<h2>${novo ? 'Novo item de estoque' : 'Editar item'}</h2>
      <form id="formEst" class="form-grade">
        <label class="field full"><span>Nome</span><input class="input" name="nome" required value="${esc(e.nome)}" placeholder="Ex.: Verniz HS 2K"></label>
        <label class="field"><span>Categoria</span><select class="select" name="categoria">${PF.CAT_ESTOQUE.map((c) => `<option ${c === e.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="field"><span>Unidade</span><select class="select" name="unidade">${PF.UNIDADES.map((u) => `<option ${u === e.unidade ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
        ${novo ? '<label class="field"><span>Quantidade atual</span><input class="input num" name="qtd" type="number" min="0" step="0.01" value="0"></label>' : ''}
        <label class="field"><span>Estoque mínimo</span><input class="input num" name="minimo" type="number" min="0" step="0.01" value="${e.minimo}"></label>
        <label class="field"><span>Custo por unidade (R$)</span><input class="input num" name="custo" type="number" min="0" step="0.01" value="${e.custo}"></label>
        <label class="field"><span>Fornecedor</span><input class="input" name="fornecedor" value="${esc(e.fornecedor)}"></label>
        <label class="field ${novo ? '' : 'full'}"><span>Onde fica</span><input class="input" name="local" value="${esc(e.local || '')}" placeholder="Ex.: prateleira da cabine"></label>
        <div class="modal__acoes full">${novo ? '' : `<button type="button" class="btn btn--danger" data-action="est-remover" data-item="${e.id}">Excluir item</button>`}<button type="button" class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn" type="submit">${novo ? 'Cadastrar item' : 'Salvar alterações'}</button></div>
      </form>`, {
      aoAbrir: (m) => { $('#formEst', m).onsubmit = (ev) => {
        ev.preventDefault(); const d = formDados(ev.target);
        const dados = { nome: d.nome.trim(), categoria: d.categoria, unidade: d.unidade, minimo: parseFloat(d.minimo) || 0, custo: parseFloat(d.custo) || 0, fornecedor: d.fornecedor.trim(), local: d.local.trim() };
        if (novo) {
          const n = { id: PF.uid(), qtd: parseFloat(d.qtd) || 0, ...dados };
          db().estoque.push(n);
          if (n.qtd > 0) db().movEstoque.push({ id: PF.uid(), data: new Date().toISOString(), itemId: n.id, tipo: 'entrada', qtd: n.qtd, custoUnit: n.custo, osId: null, obs: 'Cadastro do item' });
          salvar('Item cadastrado.'); fecharModal(); location.hash = `#/estoque/${n.id}`;
        } else { Object.assign(item, dados); salvar('Item atualizado.'); fecharModal(); render(); }
      }; },
    });
  }
  function formMovEstoque(tipo, item, osFixa) {
    const ativos = db().os.filter((o) => o.status !== 'entregue');
    const titulos = { entrada: 'Registrar entrada', saida: osFixa ? `Usar do estoque na OS ${osFixa.numero}` : 'Registrar saída', ajuste: 'Ajustar contagem' };
    const opcItens = db().estoque.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((e) => `<option value="${e.id}" ${item && e.id === item.id ? 'selected' : ''} ${tipo === 'saida' && e.qtd <= 0 ? 'disabled' : ''}>${esc(e.nome)} (${qtdFmt(e.qtd)} ${esc(e.unidade)})</option>`).join('');
    modal(`<h2>${titulos[tipo]}</h2>
      <form id="formMov" class="form-grade">
        <label class="field full"><span>Item</span><select class="select" name="itemId" ${item ? 'disabled' : ''}>${opcItens}</select></label>
        ${tipo === 'ajuste'
          ? `<label class="field"><span>Quantidade contada</span><input class="input num" name="qtd" type="number" min="0" step="0.01" required value="${item.qtd}"></label><label class="field"><span>Motivo</span><input class="input" name="obs" placeholder="Ex.: inventário do mês"></label>`
          : `<label class="field"><span>Quantidade</span><input class="input num" name="qtd" type="number" min="0.01" step="0.01" required></label>
             ${tipo === 'entrada' ? `<label class="field"><span>Custo por unidade (R$)</span><input class="input num" name="custo" type="number" min="0" step="0.01" value="${item ? item.custo : ''}"></label>` : `<label class="field"><span>Para qual OS</span><select class="select" name="osId" ${osFixa ? 'disabled' : ''}><option value="">Uso geral da oficina</option>${ativos.map((o) => `<option value="${o.id}" ${osFixa && o.id === osFixa.id ? 'selected' : ''}>OS ${o.numero}, ${esc(veic(o).placa)} ${esc(veic(o).modelo)}</option>`).join('')}</select></label>`}
             <label class="field"><span>Data</span><input class="input" type="date" name="data" value="${PF.toInputDate(new Date().toISOString())}"></label>
             <label class="field"><span>Observação</span><input class="input" name="obs" placeholder="${tipo === 'entrada' ? 'Ex.: nota fiscal 1234' : 'Ex.: retoque no para-lama'}"></label>
             ${tipo === 'entrada' ? '<label class="check full"><input type="checkbox" name="despesa" checked>Lançar a compra nas despesas da oficina</label>' : '<p class="nota full">Se escolher uma OS, o valor entra como custo daquele carro e aparece na margem.</p>'}`}
        <div class="modal__acoes full"><button type="button" class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn" type="submit">${tipo === 'entrada' ? 'Registrar entrada' : tipo === 'saida' ? 'Registrar saída' : 'Salvar contagem'}</button></div>
      </form>`, {
      aoAbrir: (m) => {
        const f = $('#formMov', m);
        if (tipo === 'entrada' && !item) { f.itemId.onchange = () => { const e = PF.find.estoque(f.itemId.value); if (e) f.custo.value = e.custo; }; f.itemId.onchange(); }
        f.onsubmit = (ev) => {
          ev.preventDefault();
          const d = formDados(f);
          const e = item || PF.find.estoque(d.itemId);
          const os = osFixa || (d.osId ? PF.find.os(d.osId) : null);
          const msg = movimentarEstoque(e, tipo, parseFloat(d.qtd) || 0, { custo: parseFloat(d.custo), data: PF.fromInputDate(d.data), obs: (d.obs || '').trim(), os, despesa: !!d.despesa });
          if (!msg) return;
          salvar(msg); fecharModal(); render();
        };
      },
    });
  }
  function movimentarEstoque(e, tipo, qtd, { custo, data, obs, os, despesa }) {
    data = data || new Date().toISOString();
    const r2 = (n) => Math.round(n * 100) / 100;
    if (tipo === 'ajuste') {
      const dif = r2(qtd - e.qtd);
      if (!dif) return 'A contagem já confere.';
      db().movEstoque.push({ id: PF.uid(), data, itemId: e.id, tipo: 'ajuste', qtd: dif, custoUnit: e.custo, osId: null, obs: obs || 'Ajuste de contagem' });
      e.qtd = qtd;
      return 'Contagem ajustada.';
    }
    if (qtd <= 0) { toast('Informe uma quantidade maior que zero.'); return null; }
    if (tipo === 'entrada') {
      const c = isFinite(custo) && custo > 0 ? custo : e.custo;
      e.custo = e.qtd > 0 ? r2((e.qtd * e.custo + qtd * c) / (e.qtd + qtd)) : c;
      e.qtd = r2(e.qtd + qtd);
      db().movEstoque.push({ id: PF.uid(), data, itemId: e.id, tipo: 'entrada', qtd, custoUnit: c, osId: null, obs });
      if (despesa) db().despesas.push({ id: PF.uid(), data, descricao: `Compra: ${e.nome}`, categoria: 'Tintas e materiais', valor: r2(qtd * c), pago: true });
      return `Entrada de ${qtdFmt(qtd)} ${e.unidade} registrada.`;
    }
    if (qtd > e.qtd) { toast(`Só há ${qtdFmt(e.qtd)} ${e.unidade} em estoque.`); return null; }
    e.qtd = r2(e.qtd - qtd);
    const mov = { id: PF.uid(), data, itemId: e.id, tipo: 'saida', qtd, custoUnit: e.custo, osId: os ? os.id : null, obs: obs || (os ? `Usado na OS ${os.numero}` : 'Uso geral da oficina') };
    db().movEstoque.push(mov);
    if (os) os.custos.push({ id: PF.uid(), data, descricao: `${e.nome} (${qtdFmt(qtd)} ${e.unidade})`, categoria: e.categoria === 'Peças' ? 'Peças' : 'Tintas e materiais', valor: r2(qtd * e.custo), movId: mov.id });
    return os ? `Saída registrada e lançada como custo da OS ${os.numero}.` : 'Saída registrada.';
  }
  function listaCompras() {
    const itens = abaixoMinimo();
    if (!itens.length) { toast('Nenhum item abaixo do mínimo.'); return; }
    mostrarPDF('Lista de compras', PFDocs.compras(itens), 'Lista de compras Paint Forza.pdf', null, '', null);
  }

  // ---------- AGENDA ----------
  const COR_AGENDA = { 'Orçamento': '#2F62C9', 'Entrada de carro': '#6D4FB8', 'Retirada': '#23864E', 'Entrega prevista': '#8E9196' };
  const mesmoDia = (iso, d) => { const x = new Date(iso); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate(); };
  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const quando = (iso) => `${mesmoDia(iso, PF.today0()) ? 'hoje' : new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })} às ${hora(iso)}`;
  function inicioSemana(off) { const d = PF.today0(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + off * 7); return d; }
  function eventosDoDia(d) {
    const ag = db().agenda.filter((a) => mesmoDia(a.data, d)).sort((a, b) => new Date(a.data) - new Date(b.data)).map((a) => ({ ...a, fonte: 'agenda' }));
    const entregas = db().os.filter((o) => !['pronto', 'entregue'].includes(o.status) && mesmoDia(o.previsao, d)).map((o) => ({ id: o.id, fonte: 'os', tipo: 'Entrega prevista', data: null, cliente: cli(o).nome, telefone: cli(o).telefone, placa: veic(o).placa, modelo: nomeCarro(veic(o)), servico: `OS ${o.numero}, ${PF.statusOf(o.status).label.toLowerCase()}` }));
    return [...ag, ...entregas];
  }
  function cartaoEvento(ev) {
    const nome = String(ev.cliente || '').split(' ')[0];
    const msg = ev.tipo === 'Orçamento' ? `Olá, ${nome}! Aqui é da Paint Forza. Confirmando sua avaliação de orçamento ${quando(ev.data)}. Te esperamos!`
      : ev.tipo === 'Entrada de carro' ? `Olá, ${nome}! Aqui é da Paint Forza. Confirmando a entrada do seu ${ev.modelo} ${quando(ev.data)}. Qualquer imprevisto, é só avisar.`
        : `Olá, ${nome}! Aqui é da Paint Forza. Lembrando da retirada do seu ${ev.modelo} ${ev.data ? quando(ev.data) : ''}.`;
    return `<article class="evento" style="--c:${COR_AGENDA[ev.tipo]}">
      <div class="evento__topo"><span class="evento__hora">${ev.data ? hora(ev.data) : 'Previsão'}</span><span class="evento__tipo">${esc(ev.tipo)}</span></div>
      <b>${esc(ev.cliente)}</b>
      <span class="nota">${esc(ev.modelo || '')}${ev.placa ? `, ${esc(ev.placa)}` : ''}</span>
      ${ev.servico ? `<span class="evento__serv">${esc(ev.servico)}</span>` : ''}
      <div class="evento__acoes">${ev.fonte === 'os' ? `<a class="btn btn--sm btn--ghost" href="#/os/${ev.id}">Abrir OS</a>`
        : `<a class="btn btn--sm btn--ghost" target="_blank" rel="noopener" href="${PF.waLink(ev.telefone, msg)}">${ICON_ZAP}Confirmar</a>${ev.tipo !== 'Retirada' ? `<button class="btn btn--sm btn--ghost" data-action="ag-os" data-item="${ev.id}">Abrir OS</button>` : ''}<button class="x" data-action="ag-rm" data-item="${ev.id}" aria-label="Remover agendamento">×</button>`}</div>
    </article>`;
  }
  function agenda() {
    titulo('Agenda');
    const ini = inicioSemana(ui.semana);
    const dias = Array.from({ length: 6 }, (_, i) => { const d = new Date(ini); d.setDate(d.getDate() + i); return d; });
    const hoje = PF.today0();
    view.innerHTML = `
      <div class="pg-topo"><div><h1>Agenda</h1><p>Semana de ${fmt.dateShort(dias[0].toISOString())} a ${fmt.dateShort(dias[5].toISOString())}. Orçamentos, entradas, retiradas e entregas previstas das OS.</p></div>
        <div class="pg-acoes"><div class="seg" role="group" aria-label="Semana"><button type="button" data-action="ag-semana" data-v="-1" aria-label="Semana anterior">‹</button><button type="button" data-action="ag-semana" data-v="0" aria-pressed="${ui.semana === 0}">Esta semana</button><button type="button" data-action="ag-semana" data-v="1" aria-label="Próxima semana">›</button></div><button class="btn" data-action="ag-novo">Novo agendamento</button></div></div>
      <div class="agenda">
        ${dias.map((d) => { const evs = eventosDoDia(d); const ehHoje = d.getTime() === hoje.getTime(); return `<section class="agenda__dia${ehHoje ? ' is-hoje' : ''}${d < hoje ? ' is-passado' : ''}">
          <h2><span>${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span><b>${d.getDate()}</b>${ehHoje ? '<em>Hoje</em>' : ''}</h2>
          ${evs.length ? evs.map(cartaoEvento).join('') : '<p class="agenda__livre">Livre</p>'}
        </section>`; }).join('')}
      </div>`;
  }
  function formAgendamento() {
    const amanha = new Date(Date.now() + PF.DAY);
    modal(`<h2>Novo agendamento</h2>
      <form id="formAg" class="form-grade">
        <label class="field"><span>Tipo</span><select class="select" name="tipo">${PF.TIPOS_AGENDA.map((t) => `<option>${t}</option>`).join('')}</select></label>
        <div class="form-grade" style="gap:10px"><label class="field"><span>Dia</span><input class="input" type="date" name="dia" required value="${PF.toInputDate(amanha.toISOString())}"></label><label class="field"><span>Hora</span><input class="input" type="time" name="hora" required value="09:00"></label></div>
        <label class="field"><span>Cliente</span><input class="input" name="cliente" required list="listaClientes" autocomplete="off"></label>
        <label class="field"><span>WhatsApp</span><input class="input" name="telefone" inputmode="tel" required></label>
        <label class="field"><span>Carro</span><input class="input" name="modelo" placeholder="Ex.: Toyota Corolla"></label>
        <label class="field"><span>Placa</span><input class="input" name="placa" style="text-transform:uppercase"></label>
        <label class="field full"><span>Serviço</span><input class="input" name="servico" placeholder="Ex.: orçamento de amassado na porta"></label>
        <datalist id="listaClientes">${db().clientes.map((c) => `<option value="${esc(c.nome)}">`).join('')}</datalist>
        <div class="modal__acoes full"><button type="button" class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn" type="submit">Agendar</button></div>
      </form>`, {
      aoAbrir: (m) => {
        const f = $('#formAg', m);
        f.cliente.addEventListener('change', () => {
          const c = db().clientes.find((x) => x.nome === f.cliente.value); if (!c) return;
          f.telefone.value = c.telefone;
          const v = db().veiculos.find((x) => x.clienteId === c.id);
          if (v) { f.modelo.value = nomeCarro(v); f.placa.value = v.placa; }
        });
        f.onsubmit = (e) => {
          e.preventDefault(); const d = formDados(f);
          db().agenda.push({ id: PF.uid(), data: new Date(`${d.dia}T${d.hora}:00`).toISOString(), tipo: d.tipo, cliente: d.cliente.trim(), telefone: d.telefone.trim(), placa: d.placa.toUpperCase().replace(/[^A-Z0-9]/g, ''), modelo: d.modelo.trim(), servico: d.servico.trim(), obs: '' });
          salvar('Agendamento criado.'); fecharModal();
          if (location.hash !== '#/agenda') location.hash = '#/agenda'; else render();
        };
      },
    });
  }

  // ---------- MAIS (menu do celular) ----------
  function mais() {
    titulo('Mais');
    const itens = [['#/veiculos', 'Veículos', 'Histórico e financeiro de cada carro'], ['#/clientes', 'Clientes', 'Contatos, carros e ordens de serviço'], ['#/financeiro', 'Financeiro', 'Recebimentos, despesas, seguradoras e comissões'], ['#/config', 'Ajustes', 'Oficina, equipe, garantias e tabela de preços']];
    view.innerHTML = `<div class="pg-topo"><div><h1>Mais</h1></div></div>
      <nav class="docs-lista">${itens.map(([h, t, d]) => `<a href="${h}"><span><b>${t}</b><span>${d}</span></span>${ICON_SETA}</a>`).join('')}
        <a href="index.html" target="_blank"><span><b>Ver o site</b><span>Como o cliente vê a Paint Forza</span></span>${ICON_SETA}</a></nav>
      <button class="btn btn--ghost" style="margin-top:16px" type="button" id="btnSairMais">Sair</button>`;
    $('#btnSairMais').onclick = () => { sessionStorage.removeItem(SESSAO); iniciar(); };
  }

  // ---------- formulários em janela ----------
  function novaOS(placaInicial = '', pre = {}) {
    const hoje = new Date(); const prev = new Date(hoje.getTime() + 5 * PF.DAY);
    modal(`<h2>Nova ordem de serviço</h2>
      <form id="formOS" class="grade" style="gap:14px">
        <label class="field"><span>Placa</span><input class="input" name="placa" required maxlength="8" autocomplete="off" placeholder="ABC1D23" style="text-transform:uppercase;font-family:var(--f-placa);font-size:24px;letter-spacing:.08em" value="${esc(placaInicial)}"></label>
        <div id="osVeic"></div>
        <div class="form-grade">
          <label class="field"><span>Tipo de serviço</span><select class="select" name="fluxo">${Object.entries(PF.FLUXOS).map(([k, f]) => `<option value="${k}">${f.label}</option>`).join('')}</select></label>
          <label class="field"><span>Previsão de entrega</span><input class="input" type="date" name="previsao" value="${PF.toInputDate(prev.toISOString())}" required></label>
          <label class="field"><span>Origem</span><select class="select" name="origem"><option>Particular</option><option>Seguradora</option></select></label>
          <label class="field seg-campo"><span>Seguradora</span><select class="select" name="seguradora">${PF.SEGURADORAS.map((x) => `<option>${x}</option>`).join('')}</select></label>
          <label class="field seg-campo"><span>Nº do sinistro</span><input class="input" name="sinistro"></label>
          <label class="field seg-campo"><span>Franquia paga pelo cliente (R$)</span><input class="input num" type="number" min="0" step="0.01" name="franquia"></label>
          <label class="field full"><span>O que o cliente relatou</span><textarea class="textarea" name="relato" required placeholder="Ex.: batida na traseira, para-choque trincado"></textarea></label>
          <label class="field full"><span>Responsável</span><input class="input" name="responsavel" value="Diego (chefe de oficina)"></label>
        </div>
        <div class="modal__acoes"><button type="button" class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn" type="submit">Abrir OS e fazer vistoria</button></div>
      </form>`, {
      largo: true,
      aoAbrir: (m) => {
        const f = $('#formOS', m), alvo = $('#osVeic', m);
        const atualizar = () => {
          const placa = f.placa.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const v = placa.length >= 7 ? PF.find.veiculoPlaca(placa) : null;
          if (v) {
            const c = PF.find.cliente(v.clienteId) || {};
            alvo.innerHTML = `<div class="aviso ok"><span>${carroCel(v)} <span class="nota" style="display:block;margin-top:6px">Dono: <b>${esc(c.nome)}</b>, ${esc(c.telefone)}. ${db().os.filter((o) => o.veiculoId === v.id).length} visita(s) anteriores.</span></span></div>`;
            alvo.dataset.veiculo = v.id;
          } else if (alvo.dataset.veiculo || !alvo.innerHTML) {
            delete alvo.dataset.veiculo;
            alvo.innerHTML = `<div class="form-grade">
              <p class="nota full">${placa.length >= 7 ? 'Placa nova. Cadastre o carro e o dono:' : 'Digite a placa para buscar o carro. Se for novo, cadastre abaixo:'}</p>
              <label class="field"><span>Marca</span><input class="input" name="marca" placeholder="Ex.: Toyota"></label>
              <label class="field"><span>Modelo</span><input class="input" name="modelo" placeholder="Ex.: Corolla XEi"></label>
              <label class="field"><span>Ano</span><input class="input" name="ano" type="number" min="1950" max="2030" placeholder="2022"></label>
              <label class="field"><span>Cor</span><input class="input" name="cor" placeholder="Ex.: Prata"></label>
              <label class="field full"><span>Cliente</span><select class="select" name="clienteId"><option value="">Novo cliente</option>${db().clientes.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label>
              <label class="field novo-cli"><span>Nome do cliente</span><input class="input" name="nome"></label>
              <label class="field novo-cli"><span>WhatsApp</span><input class="input" name="telefone" inputmode="tel" placeholder="(91) 9 0000-0000"></label>
            </div>`;
            const sel = f.clienteId;
            sel.onchange = () => $$('.novo-cli', alvo).forEach((x) => { x.hidden = !!sel.value; });
          } else {
            const p = $('p', alvo); if (p) p.textContent = placa.length >= 7 ? 'Placa nova. Cadastre o carro e o dono:' : 'Digite a placa para buscar o carro. Se for novo, cadastre abaixo:';
          }
        };
        f.placa.addEventListener('input', atualizar);
        atualizar();
        const camposSeg = () => $$('.seg-campo', m).forEach((x) => { x.hidden = f.origem.value !== 'Seguradora'; });
        f.origem.onchange = camposSeg; camposSeg();
        if (pre.relato) f.relato.value = pre.relato;
        if (!alvo.dataset.veiculo) {
          if (pre.modelo && f.modelo) f.modelo.value = pre.modelo;
          if (pre.nome && f.nome) { const c = db().clientes.find((x) => x.nome === pre.nome); if (c) { f.clienteId.value = c.id; f.clienteId.onchange(); } else f.nome.value = pre.nome; }
          if (pre.telefone && f.telefone) f.telefone.value = pre.telefone;
        }
        f.onsubmit = (e) => {
          e.preventDefault();
          const d = formDados(f);
          const placa = d.placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
          let v = alvo.dataset.veiculo ? PF.find.veiculo(alvo.dataset.veiculo) : null;
          if (!v) {
            if (!d.modelo || (!d.clienteId && !d.nome)) { toast('Preencha o modelo do carro e o cliente.'); return; }
            let c = d.clienteId ? PF.find.cliente(d.clienteId) : null;
            if (!c) { c = { id: PF.uid(), nome: d.nome.trim(), telefone: d.telefone.trim(), email: '', tipo: 'PF', criadoEm: new Date().toISOString() }; db().clientes.push(c); }
            v = { id: PF.uid(), clienteId: c.id, placa, marca: d.marca.trim(), modelo: d.modelo.trim(), ano: parseInt(d.ano, 10) || '', cor: d.cor.trim() || '—', corHex: '#9AA0A6' };
            db().veiculos.push(v);
          }
          const os = criarOS(v, d);
          salvar(`OS ${os.numero} aberta. Faça a vistoria de entrada.`);
          fecharModal();
          location.hash = `#/os/${os.id}/entrada`;
        };
      },
    });
  }
  function criarOS(v, d) {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codigo = Array.from({ length: 4 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
    const os = {
      id: PF.uid(), numero: db().seq++, codigo, veiculoId: v.id, clienteId: v.clienteId, fluxo: d.fluxo, status: 'orcamento',
      abertura: new Date().toISOString(), previsao: PF.fromInputDate(d.previsao), entrega: null, responsavel: d.responsavel, origem: d.origem, sinistro: d.sinistro || '', relato: d.relato.trim(), fotosEtapas: [],
      seguradora: d.origem === 'Seguradora' ? { nome: d.seguradora, franquia: parseFloat(d.franquia) || 0, autorizacao: 'aguardando', valorAutorizado: null } : null,
      entrada: { km: null, combustivel: 4, itens: {}, avarias: [], fotos: [], obs: '', assinatura: null, data: new Date().toISOString() },
      itens: [], desconto: 0, pagamentos: [], custos: [], saida: { km: null, checklist: {}, fotos: [], obs: '', assinatura: null, data: null }, aprovadoEm: null,
      historico: [{ id: PF.uid(), data: new Date().toISOString(), status: 'orcamento', nota: 'Carro recebido.' }],
    };
    db().os.unshift(os);
    return os;
  }
  function editarOS(os) {
    modal(`<h2>Editar OS ${os.numero}</h2>
      <form id="formEd" class="form-grade">
        <label class="field"><span>Etapa</span><select class="select" name="status">${PF.STATUS.map((s) => `<option value="${s.id}" ${s.id === os.status ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
        <label class="field"><span>Tipo de serviço</span><select class="select" name="fluxo">${Object.entries(PF.FLUXOS).map(([k, f]) => `<option value="${k}" ${k === os.fluxo ? 'selected' : ''}>${f.label}</option>`).join('')}</select></label>
        <label class="field"><span>Previsão de entrega</span><input class="input" type="date" name="previsao" value="${PF.toInputDate(os.previsao)}"></label>
        <label class="field"><span>Responsável</span><input class="input" name="responsavel" value="${esc(os.responsavel)}"></label>
        <label class="field"><span>Origem</span><select class="select" name="origem">${['Particular', 'Seguradora'].map((o) => `<option ${o === os.origem ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
        <label class="field seg-campo"><span>Seguradora</span><select class="select" name="seguradora">${PF.SEGURADORAS.map((x) => `<option ${os.seguradora && x === os.seguradora.nome ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field seg-campo"><span>Nº do sinistro</span><input class="input" name="sinistro" value="${esc(os.sinistro)}"></label>
        <label class="field seg-campo"><span>Franquia paga pelo cliente (R$)</span><input class="input num" type="number" min="0" step="0.01" name="franquia" value="${os.seguradora ? os.seguradora.franquia : ''}"></label>
        <label class="field seg-campo"><span>Autorização</span><select class="select" name="autorizacao">${Object.entries(PF.AUTORIZACAO).map(([k, l]) => `<option value="${k}" ${os.seguradora && os.seguradora.autorizacao === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field full"><span>Relato do cliente</span><textarea class="textarea" name="relato">${esc(os.relato)}</textarea></label>
        <div class="modal__acoes full"><button type="button" class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn" type="submit">Salvar alterações</button></div>
      </form>`, {
      aoAbrir: (m) => {
        const fe = $('#formEd', m);
        const camposSeg = () => $$('.seg-campo', m).forEach((x) => { x.hidden = fe.origem.value !== 'Seguradora'; });
        fe.origem.onchange = camposSeg; camposSeg();
        fe.onsubmit = (e) => {
        e.preventDefault();
        const d = formDados(e.target);
        os.seguradora = d.origem === 'Seguradora' ? { nome: d.seguradora, franquia: parseFloat(d.franquia) || 0, autorizacao: d.autorizacao, valorAutorizado: os.seguradora ? os.seguradora.valorAutorizado : null } : null;
        Object.assign(os, { fluxo: d.fluxo, previsao: PF.fromInputDate(d.previsao) || os.previsao, responsavel: d.responsavel, origem: d.origem, sinistro: d.sinistro, relato: d.relato });
        if (!PF.FLUXOS[os.fluxo].etapas.includes(d.status)) os.fluxo = 'completo';
        if (d.status !== os.status) PF.setStatus(os, d.status, 'Etapa alterada manualmente.');
        salvar('OS atualizada.'); fecharModal(); render();
      }; },
    });
  }
  function formPagamento(os) {
    const t = PF.totais(os);
    const seg = PF.temSeguradora(os);
    const sugestao = seg ? (t.saldoCliente || t.saldoSeguradora) : Math.max(0, t.total - t.pago);
    const formaInicial = seg && !t.saldoCliente && t.saldoSeguradora ? 'Seguradora' : 'Pix';
    modal(`<h2>Registrar pagamento</h2><p class="nota" style="margin:-8px 0 16px">OS ${os.numero}, ${esc(veic(os).placa)}. ${seg ? `Cliente deve ${fmt.money(t.saldoCliente)} da franquia; ${esc(os.seguradora.nome)} deve ${fmt.money(t.saldoSeguradora)}.` : `Saldo atual: ${fmt.money(Math.max(0, t.total - t.pago))}`}</p>
      <form id="formPag" class="form-grade">
        <label class="field"><span>Valor (R$)</span><input class="input num" name="valor" type="number" min="0.01" step="0.01" required value="${sugestao.toFixed(2)}"></label>
        <label class="field"><span>Forma</span><select class="select" name="forma">${PF.FORMAS.map((f) => `<option ${f === formaInicial ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label class="field"><span>Data</span><input class="input" type="date" name="data" value="${PF.toInputDate(new Date().toISOString())}" required></label>
        <label class="field"><span>Observação</span><input class="input" name="obs" placeholder="Ex.: entrada de 50%, 3x no cartão"></label>
        <div class="modal__acoes full"><button type="button" class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn" type="submit">Registrar pagamento</button></div>
      </form>`, {
      aoAbrir: (m) => {
        const f = $('#formPag', m);
        if (seg) f.forma.onchange = () => { f.valor.value = (f.forma.value === 'Seguradora' ? t.saldoSeguradora : t.saldoCliente).toFixed(2); };
        f.onsubmit = (e) => {
          e.preventDefault(); const d = formDados(f); const valor = parseFloat(d.valor) || 0;
          os.pagamentos.push({ id: PF.uid(), data: PF.fromInputDate(d.data), valor, forma: d.forma, obs: d.obs.trim() });
          os.historico.unshift({ id: PF.uid(), data: new Date().toISOString(), status: null, nota: `Pagamento de ${fmt.money(valor)} (${d.forma}) registrado.` });
          salvar('Pagamento registrado.'); fecharModal(); render();
        };
      },
    });
  }
  function formCusto(os) {
    modal(`<h2>Lançar custo</h2><p class="nota" style="margin:-8px 0 16px">O custo fica ligado à OS ${os.numero} (${esc(veic(os).placa)}) e entra na margem deste carro.</p>
      <form id="formCusto" class="form-grade">
        <label class="field full"><span>Descrição</span><input class="input" name="descricao" required placeholder="Ex.: tinta base + verniz"></label>
        <label class="field"><span>Categoria</span><select class="select" name="categoria">${PF.CAT_CUSTO.map((c) => `<option>${c}</option>`).join('')}</select></label>
        <label class="field"><span>Valor (R$)</span><input class="input num" name="valor" type="number" min="0.01" step="0.01" required></label>
        <label class="field"><span>Data</span><input class="input" type="date" name="data" value="${PF.toInputDate(new Date().toISOString())}" required></label>
        <div class="modal__acoes full"><button type="button" class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn" type="submit">Lançar custo</button></div>
      </form>`, {
      aoAbrir: (m) => { $('#formCusto', m).onsubmit = (e) => {
        e.preventDefault(); const d = formDados(e.target);
        os.custos.push({ id: PF.uid(), data: PF.fromInputDate(d.data), descricao: d.descricao.trim(), categoria: d.categoria, valor: parseFloat(d.valor) || 0 });
        salvar('Custo lançado.'); fecharModal(); render();
      }; },
    });
  }
  function formDespesa() {
    modal(`<h2>Nova despesa</h2>
      <form id="formDesp" class="form-grade">
        <label class="field full"><span>Descrição</span><input class="input" name="descricao" required placeholder="Ex.: conta de energia"></label>
        <label class="field"><span>Categoria</span><select class="select" name="categoria">${PF.CAT_DESPESA.map((c) => `<option>${c}</option>`).join('')}</select></label>
        <label class="field"><span>Valor (R$)</span><input class="input num" name="valor" type="number" min="0.01" step="0.01" required></label>
        <label class="field"><span>Vencimento</span><input class="input" type="date" name="data" value="${PF.toInputDate(new Date().toISOString())}" required></label>
        <label class="check" style="align-self:end"><input type="checkbox" name="pago">Já está paga</label>
        <div class="modal__acoes full"><button type="button" class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn" type="submit">Salvar despesa</button></div>
      </form>`, {
      aoAbrir: (m) => { $('#formDesp', m).onsubmit = (e) => {
        e.preventDefault(); const d = formDados(e.target);
        db().despesas.push({ id: PF.uid(), data: PF.fromInputDate(d.data), descricao: d.descricao.trim(), categoria: d.categoria, valor: parseFloat(d.valor) || 0, pago: !!d.pago });
        salvar('Despesa salva.'); fecharModal(); render();
      }; },
    });
  }
  function formCliente(c) {
    const novo = !c;
    c = c || { nome: '', telefone: '', email: '', tipo: 'PF' };
    modal(`<h2>${novo ? 'Novo cliente' : 'Editar cliente'}</h2>
      <form id="formCli" class="form-grade">
        <label class="field full"><span>Nome</span><input class="input" name="nome" required value="${esc(c.nome)}"></label>
        <label class="field"><span>WhatsApp</span><input class="input" name="telefone" inputmode="tel" required value="${esc(c.telefone)}"></label>
        <label class="field"><span>Tipo</span><select class="select" name="tipo"><option value="PF" ${c.tipo === 'PF' ? 'selected' : ''}>Pessoa física</option><option value="PJ" ${c.tipo === 'PJ' ? 'selected' : ''}>Empresa</option></select></label>
        <label class="field full"><span>E-mail</span><input class="input" type="email" name="email" value="${esc(c.email)}"></label>
        <div class="modal__acoes full"><button type="button" class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn" type="submit">${novo ? 'Cadastrar cliente' : 'Salvar alterações'}</button></div>
      </form>`, {
      aoAbrir: (m) => { $('#formCli', m).onsubmit = (e) => {
        e.preventDefault(); const d = formDados(e.target);
        if (novo) { const n = { id: PF.uid(), criadoEm: new Date().toISOString(), ...d }; db().clientes.push(n); salvar('Cliente cadastrado.'); fecharModal(); location.hash = `#/clientes/${n.id}`; }
        else { Object.assign(c, d); salvar('Cliente atualizado.'); fecharModal(); render(); }
      }; },
    });
  }
  function formVeiculo(v) {
    modal(`<h2>Editar veículo</h2>
      <form id="formVeic" class="form-grade">
        <label class="field"><span>Placa</span><input class="input" name="placa" required value="${esc(v.placa)}" style="text-transform:uppercase"></label>
        <label class="field"><span>Ano</span><input class="input" name="ano" type="number" value="${v.ano}"></label>
        <label class="field"><span>Marca</span><input class="input" name="marca" value="${esc(v.marca)}"></label>
        <label class="field"><span>Modelo</span><input class="input" name="modelo" value="${esc(v.modelo)}"></label>
        <label class="field"><span>Cor</span><input class="input" name="cor" value="${esc(v.cor)}"></label>
        <label class="field"><span>Tom da cor</span><input class="input" type="color" name="corHex" value="${v.corHex || '#9aa0a6'}" style="padding:4px"></label>
        <label class="field full"><span>Dono</span><select class="select" name="clienteId">${db().clientes.map((c) => `<option value="${c.id}" ${c.id === v.clienteId ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
        <div class="modal__acoes full"><button type="button" class="btn btn--ghost" data-action="fechar-modal">Cancelar</button><button class="btn" type="submit">Salvar alterações</button></div>
      </form>`, {
      aoAbrir: (m) => { $('#formVeic', m).onsubmit = (e) => {
        e.preventDefault(); const d = formDados(e.target);
        Object.assign(v, d, { placa: d.placa.toUpperCase().replace(/[^A-Z0-9]/g, ''), ano: parseInt(d.ano, 10) || v.ano });
        salvar('Veículo atualizado.'); fecharModal(); render();
      }; },
    });
  }
  function buscar(q) {
    q = q.trim(); if (!q) return;
    const ql = q.toLowerCase(), qp = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const porNum = PF.find.osNumero(q);
    if (porNum) { location.hash = `#/os/${porNum.id}`; return; }
    const vs = db().veiculos.filter((v) => v.placa.includes(qp) && qp.length >= 3 || `${v.marca} ${v.modelo}`.toLowerCase().includes(ql));
    const cs = db().clientes.filter((c) => c.nome.toLowerCase().includes(ql) || c.telefone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§'));
    if (vs.length === 1 && !cs.length) { location.hash = `#/veiculos/${vs[0].id}`; return; }
    modal(`<h2>Resultados para “${esc(q)}”</h2>
      ${vs.length || cs.length ? `<div class="busca-res">
        ${vs.map((v) => `<a href="#/veiculos/${v.id}" data-action="fechar-modal-link">${carroCel(v, (PF.find.cliente(v.clienteId) || {}).nome)}</a>`).join('')}
        ${cs.map((c) => `<a href="#/clientes/${c.id}" data-action="fechar-modal-link"><b>${esc(c.nome)}</b><span class="nota">${esc(c.telefone)}</span></a>`).join('')}
      </div>` : '<p class="vazio">Nada encontrado. Tente a placa sem traço, o nome do cliente ou o número da OS.</p>'}`);
  }

  // ---------- fotos e assinatura ----------
  function comprimir(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1024 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = rej; img.src = url;
    });
  }
  function iniciarAssinaturas() {
    $$('canvas[data-assin]', view).forEach((cv) => {
      const r = cv.getBoundingClientRect(), ratio = devicePixelRatio || 1;
      cv.width = r.width * ratio; cv.height = r.height * ratio;
      const ctx = cv.getContext('2d'); ctx.scale(ratio, ratio); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#000';
      let desenhando = false, ult;
      const pos = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
      cv.addEventListener('pointerdown', (e) => { desenhando = true; ult = pos(e); cv.setPointerCapture(e.pointerId); cv.dataset.sujo = '1'; });
      cv.addEventListener('pointermove', (e) => { if (!desenhando) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(...ult); ctx.lineTo(...p); ctx.stroke(); ult = p; });
      ['pointerup', 'pointercancel'].forEach((t) => cv.addEventListener(t, () => { desenhando = false; }));
    });
  }
  const osDaRota = () => { const m = location.hash.match(/#\/os\/([^/]+)/); return m ? PF.find.os(m[1]) : null; };
  function setCampo(obj, caminho, valor) { const ps = caminho.split('.'); const ult = ps.pop(); ps.reduce((o, k) => o[k], obj)[ult] = valor; }

  // ---------- eventos ----------
  const ACOES = {
    docs: (el) => abrirDocumentos(PF.find.os(el.dataset.id)),
    doc: (el) => verDocumento(osDaRota(), el.dataset.doc),
    recibo: (el) => { const os = osDaRota(); verDocumento(os, 'recibo', os.pagamentos.find((p) => p.id === el.dataset.item)); },
    autorizar: (el) => {
      const os = PF.find.os(el.dataset.id);
      os.seguradora.autorizacao = 'autorizado'; os.seguradora.valorAutorizado = PF.totais(os).parteSeguradora;
      os.historico.unshift({ id: PF.uid(), data: new Date().toISOString(), status: null, nota: `${os.seguradora.nome} autorizou o reparo.`, publica: true });
      salvar('Autorização registrada.'); render();
    },
    'rm-foto-etapa': async (el) => { if (!(await confirmar('Remover esta foto?', 'Remover foto', true))) return; const os = osDaRota(); os.fotosEtapas = os.fotosEtapas.filter((f) => f.id !== el.dataset.item); salvar('Foto removida.'); render(); },
    'usar-estoque': (el) => formMovEstoque('saida', null, PF.find.os(el.dataset.id)),
    'est-novo': () => formItemEstoque(null),
    'est-editar': (el) => formItemEstoque(PF.find.estoque(el.dataset.item)),
    'est-entrada': (el) => formMovEstoque('entrada', PF.find.estoque(el.dataset.item)),
    'est-saida': (el) => formMovEstoque('saida', PF.find.estoque(el.dataset.item)),
    'est-saida-livre': () => formMovEstoque('saida', null, null),
    'est-ajuste': (el) => formMovEstoque('ajuste', PF.find.estoque(el.dataset.item)),
    'est-compras': () => listaCompras(),
    'est-filtro-baixo': () => { ui.estBaixo = true; render(); },
    'est-remover': async (el) => {
      const id = el.dataset.item;
      if (!(await confirmar('Excluir este item e o histórico de movimentações dele?', 'Excluir item', true))) return;
      db().estoque = db().estoque.filter((e) => e.id !== id); db().movEstoque = db().movEstoque.filter((m) => m.itemId !== id);
      salvar('Item excluído.'); location.hash = '#/estoque';
    },
    'ag-novo': () => formAgendamento(),
    'ag-semana': (el) => { const v = +el.dataset.v; ui.semana = v === 0 ? 0 : ui.semana + v; render(); },
    'ag-os': (el) => { const a = db().agenda.find((x) => x.id === el.dataset.item); novaOS(a.placa, { relato: a.servico, modelo: a.modelo, nome: a.cliente, telefone: a.telefone }); },
    'ag-rm': async (el) => { if (!(await confirmar('Remover este agendamento?', 'Remover', true))) return; db().agenda = db().agenda.filter((x) => x.id !== el.dataset.item); salvar('Agendamento removido.'); render(); },
    'rm-membro': async (el) => { if (!(await confirmar('Remover este profissional da equipe?', 'Remover', true))) return; db().equipe = db().equipe.filter((m) => m.id !== el.dataset.item); salvar('Profissional removido.'); render(); },
    'fechar-modal': () => fecharModal(),
    'fechar-modal-link': () => setTimeout(fecharModal, 0),
    'nova-os': (el) => novaOS(el.dataset.placa || ''),
    avancar: (el) => { const os = PF.find.os(el.dataset.id); const p = PF.proximaEtapa(os); if (p) moverEtapa(os, p); },
    'editar-os': (el) => editarOS(PF.find.os(el.dataset.id)),
    'enviar-orcamento': (el) => {
      const os = PF.find.os(el.dataset.id);
      if (!os.itens.length) { toast('Adicione pelo menos um serviço antes de enviar o orçamento.'); return; }
      PF.setStatus(os, 'aprovacao', 'Orçamento enviado ao cliente.');
      const c = cli(os);
      window.open(PF.waLink(c.telefone, `Olá, ${primeiroNome(c)}! Aqui é da Paint Forza. O orçamento do seu ${nomeCarro(veic(os))} ficou em ${fmt.money(PF.totais(os).total)}. Veja os detalhes e aprove por aqui: ${PF.portalUrl(os)}`), '_blank', 'noopener');
      toast('Orçamento enviado. A OS está aguardando aprovação.'); render();
    },
    reenviar: (el) => { const os = PF.find.os(el.dataset.id), c = cli(os); window.open(PF.waLink(c.telefone, `Olá, ${primeiroNome(c)}! Segue o link para aprovar o orçamento da OS ${os.numero}: ${PF.portalUrl(os)}`), '_blank', 'noopener'); },
    aprovar: (el) => { const os = PF.find.os(el.dataset.id); PF.setStatus(os, PF.proximaEtapa(os), 'Orçamento aprovado pelo cliente (registrado pela oficina).'); toast('Aprovação registrada. O carro entrou em serviço.'); render(); },
    entregar: (el) => registrarEntrega(PF.find.os(el.dataset.id)),
    comb: (el) => { const os = osDaRota(); os.entrada.combustivel = +el.dataset.v; salvar(); render(); },
    'rm-avaria': async (el) => { const os = osDaRota(); os.entrada.avarias.splice(+el.dataset.i, 1); salvar('Avaria removida.'); render(); },
    'rm-foto': async (el) => { if (!(await confirmar('Remover esta foto?', 'Remover foto', true))) return; const os = osDaRota(); os[el.dataset.k].fotos.splice(+el.dataset.i, 1); salvar('Foto removida.'); render(); },
    'ver-foto': (el) => modal(`<img class="modal__img" src="${el.src}" alt="">`, { largo: true }),
    'assin-limpar': (el) => { const cv = $(`canvas[data-assin="${el.dataset.k}"]`); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); delete cv.dataset.sujo; },
    'assin-salvar': (el) => { const cv = $(`canvas[data-assin="${el.dataset.k}"]`); if (!cv.dataset.sujo) { toast('Peça para o cliente assinar no quadro.'); return; } const os = osDaRota(); os[el.dataset.k].assinatura = cv.toDataURL('image/png'); salvar('Assinatura salva.'); render(); },
    'assin-refazer': (el) => { const os = osDaRota(); os[el.dataset.k].assinatura = null; salvar(); render(); },
    'rm-item': (el) => { const os = osDaRota(); os.itens = os.itens.filter((i) => i.id !== el.dataset.item); salvar('Item removido.'); render(); },
    'novo-pagamento': (el) => formPagamento(PF.find.os(el.dataset.id)),
    'novo-custo': (el) => formCusto(PF.find.os(el.dataset.id)),
    'rm-pag': async (el) => { if (!(await confirmar('Remover este pagamento?', 'Remover', true))) return; const os = osDaRota(); os.pagamentos = os.pagamentos.filter((p) => p.id !== el.dataset.item); salvar('Pagamento removido.'); render(); },
    'rm-custo': (el) => {
      const os = osDaRota(); const c = os.custos.find((p) => p.id === el.dataset.item);
      if (c && c.movId) {
        const mov = db().movEstoque.find((m) => m.id === c.movId), e = mov && PF.find.estoque(mov.itemId);
        if (e) e.qtd = Math.round((e.qtd + mov.qtd) * 100) / 100;
        db().movEstoque = db().movEstoque.filter((m) => m.id !== c.movId);
      }
      os.custos = os.custos.filter((p) => p.id !== el.dataset.item);
      salvar(c && c.movId ? 'Custo removido e material devolvido ao estoque.' : 'Custo removido.'); render();
    },
    periodo: (el) => { ui.periodo = el.dataset.v; render(); },
    'lanc-tipo': (el) => { ui.lancTipo = el.dataset.v; render(); },
    'nova-despesa': () => formDespesa(),
    'toggle-despesa': (el) => { const d = db().despesas.find((x) => x.id === el.dataset.item); d.pago = !d.pago; salvar(d.pago ? 'Despesa marcada como paga.' : 'Despesa marcada como a pagar.'); render(); },
    'rm-despesa': async (el) => { if (!(await confirmar('Remover esta despesa?', 'Remover', true))) return; db().despesas = db().despesas.filter((x) => x.id !== el.dataset.item); salvar('Despesa removida.'); render(); },
    'novo-cliente': () => formCliente(null),
    'editar-cliente': (el) => formCliente(PF.find.cliente(el.dataset.id)),
    'editar-veiculo': (el) => formVeiculo(PF.find.veiculo(el.dataset.id)),
    'limpar-filtros-os': () => { ui.osFiltro = 'ativas'; ui.osBusca = ''; render(); },
    'rm-catalogo': (el) => { db().catalogo = db().catalogo.filter((c) => c.id !== el.dataset.item); salvar('Serviço removido da tabela.'); render(); },
    backup: () => {
      const blob = new Blob([JSON.stringify(db(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `paintforza-dados-${PF.toInputDate(new Date().toISOString())}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    reset: async () => { if (!(await confirmar('Apagar tudo o que foi cadastrado e voltar aos dados de exemplo?', 'Restaurar dados de exemplo', true))) return; PF.reset(); toast('Dados de exemplo restaurados.'); location.hash = '#/painel'; render(); },
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (a) {
      if (a.dataset.action !== 'fechar-modal-link') e.preventDefault();
      if (a.dataset.action !== 'fechar-modal-link' && a.closest('a[href]') && a.closest('a[href]') !== a) e.stopPropagation();
      const fn = ACOES[a.dataset.action]; if (fn) fn(a, e);
      return;
    }
    const peca = e.target.closest('.diagrama.is-interactive .peca');
    if (peca) { escolherAvaria(osDaRota(), peca.dataset.peca); return; }
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a, button, input')) location.hash = tr.dataset.href;
  });
  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset.campo) {
      const os = osDaRota(); if (!os) return;
      let v = el.value;
      if (el.dataset.tipo === 'int') v = v === '' ? null : parseInt(v, 10);
      if (el.dataset.tipo === 'num') v = parseFloat(v) || 0;
      setCampo(os, el.dataset.campo, v); salvar('Salvo.');
      if (['desconto', 'saida.km'].includes(el.dataset.campo)) render();
    } else if (el.dataset.check) {
      const os = osDaRota(); if (!os) return;
      const ps = el.dataset.check.split('.'); os[ps[0]][ps[1]][el.value] = el.checked; salvar();
    } else if (el.dataset.fotos) {
      const os = osDaRota(); const k = el.dataset.fotos; const files = [...el.files];
      if (!files.length) return;
      toast('Processando fotos…');
      for (const f of files) {
        try {
          os[k].fotos.push(await comprimir(f));
          if (!PF.save()) { os[k].fotos.pop(); toast('Armazenamento cheio: não foi possível salvar todas as fotos.'); break; }
        } catch (err) { toast('Não foi possível ler uma das imagens.'); }
      }
      render(); toast(`${files.length} foto(s) adicionada(s).`);
    } else if (el.dataset.itemExec) {
      const os = osDaRota(); os.itens.find((i) => i.id === el.dataset.itemExec).executorId = el.value || null; salvar('Responsável definido.');
    } else if (el.dataset.itemAprov) {
      const os = osDaRota(); os.itens.find((i) => i.id === el.dataset.itemAprov).status = el.checked ? 'aprovado' : 'recusado';
      salvar(el.checked ? 'Item aprovado.' : 'Item marcado como não aprovado.'); render();
    } else if (el.dataset.fotosEtapa) {
      const os = osDaRota(); const files = [...el.files];
      if (!files.length) return;
      toast('Processando fotos…');
      os.fotosEtapas = os.fotosEtapas || [];
      for (const f of files) {
        try {
          os.fotosEtapas.push({ id: PF.uid(), etapa: os.status, data: new Date().toISOString(), src: await comprimir(f) });
          if (!PF.save()) { os.fotosEtapas.pop(); toast('Armazenamento cheio: não foi possível salvar todas as fotos.'); break; }
        } catch (err) { toast('Não foi possível ler uma das imagens.'); }
      }
      render(); toast(`${files.length} foto(s) adicionada(s) em ${PF.statusOf(os.status).label}.`);
    } else if (el.dataset.equipe) {
      const [id, campo] = el.dataset.equipe.split('|'); const mb = PF.find.membro(id);
      mb[campo] = campo === 'comissao' ? parseFloat(el.value) || 0 : el.value.trim(); salvar('Equipe atualizada.');
    } else if (el.dataset.garantia) {
      db().garantias[+el.dataset.garantia].meses = parseInt(el.value, 10) || 0; salvar('Prazo de garantia atualizado.');
    } else if (el.dataset.catalogo) {
      const c = db().catalogo.find((x) => x.id === el.dataset.catalogo); c.valor = parseFloat(el.value) || 0; salvar('Preço atualizado.');
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modalEl.hidden) fecharModal(); });
  // Mudanças feitas em outra aba (ex.: cliente aprovou o orçamento no portal) aparecem aqui.
  window.addEventListener('storage', (e) => {
    if (e.key !== PF.KEY) return;
    PF.load();
    if (modalEl.hidden && !$('#shell').hidden && !view.contains(document.activeElement)) { render(); toast('Dados atualizados.'); }
  });
  $('#busca').addEventListener('submit', (e) => { e.preventDefault(); buscar(e.target.q.value); });

  iniciar();
})();
