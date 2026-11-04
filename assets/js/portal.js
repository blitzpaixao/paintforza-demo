/* Portal do cliente: acompanhamento da OS, aprovação item a item, fotos do serviço e documentos em PDF */
(function () {
  const { fmt, esc } = PF;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const el = $('#portal');
  const params = new URLSearchParams(location.search);
  const folha = $('#folha'), caixa = $('.p-folha__caixa', folha);
  if (params.get('embed')) document.documentElement.classList.add('embed');
  let escolhas = null;   // itens marcados pelo cliente antes de aprovar
  let aprovadoAgora = false;

  const ZAP = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.2c0-.1-.2-.2-.5-.3z"/></svg>';
  const ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
  const ICON_DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h7M9 17h7"/></svg>';
  const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6"/></svg>';

  let avisoT;
  function aviso(msg) { const a = $('#aviso'); a.textContent = msg; a.classList.add('on'); clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.remove('on'), 2600); }
  function abrirFolha(html, classe = '') { caixa.className = 'p-folha__caixa ' + classe; caixa.innerHTML = html; folha.hidden = false; }
  function fecharFolha() { folha.hidden = true; caixa.innerHTML = ''; }
  folha.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) fecharFolha(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !folha.hidden) fecharFolha(); });

  function entrar(erro) {
    el.innerHTML = `
      <form class="p-entrar" method="get">
        <h1>Acompanhe seu carro.</h1>
        <p>Digite o número da ordem de serviço e o código de acesso que a Paint Forza enviou no WhatsApp.</p>
        ${erro ? `<p class="p-erro">${erro}</p>` : ''}
        <label>Número da OS<input name="os" inputmode="numeric" required value="${esc(params.get('os') || '')}" placeholder="1042"></label>
        <label>Código de acesso<input name="c" required autocapitalize="characters" value="${esc(params.get('c') || '')}" placeholder="FZ7K"></label>
        <button class="p-btn" type="submit">Ver meu carro</button>
        <p class="p-nota">Demonstração: OS 1042, código FZ7K. Para aprovar um orçamento: OS 1043, código RP2B.</p>
      </form>`;
  }

  function render() {
    const num = params.get('os'), cod = (params.get('c') || '').toUpperCase().trim();
    if (!num) return entrar();
    const os = PF.find.osNumero(num);
    if (!os || os.codigo !== cod) return entrar('Não encontramos uma OS com esse número e código. Confira os dados na mensagem que você recebeu.');

    const v = PF.find.veiculo(os.veiculoId) || {}, c = PF.find.cliente(os.clienteId) || {};
    const t = PF.totais(os), st = PF.statusOf(os.status);
    const etapas = PF.FLUXOS[os.fluxo].etapas, idx = etapas.indexOf(os.status);
    const nome = c.tipo === 'PJ' ? c.nome : String(c.nome).split(' ')[0];
    const zap = PF.waLink(PF.OFICINA.whatsapp, `Olá! Sou ${c.nome}, da OS ${os.numero} (${v.marca} ${v.modelo}, placa ${v.placa}).`);
    const seg = PF.temSeguradora(os);
    document.title = `OS ${os.numero} — Paint Forza`;
    if (os.status === 'aprovacao' && !escolhas) escolhas = Object.fromEntries(os.itens.map((i) => [i.id, PF.itemAtivo(i)]));

    el.innerHTML = `
      <section class="p-ola">
        <h1>Olá, ${esc(nome)}.</h1>
        <div class="p-carro">${PF.plate(v.placa, 'lg')}<div><b>${esc(v.marca)} ${esc(v.modelo)}</b><span>${v.ano}, ${esc(v.cor)}. OS ${os.numero}</span></div></div>
      </section>

      ${aprovadoAgora ? `<div class="p-ok">${ICON_OK}<span>Orçamento aprovado. Obrigado! A equipe já foi avisada e o serviço começa em seguida.</span></div>` : ''}

      <section class="p-cartao p-status" style="--c:${st.color}">
        <span class="p-status__rotulo"><i></i>Etapa atual</span>
        <h2>${esc(st.label)}</h2>
        <p>${esc(st.cliente)}</p>
        <div class="p-progresso" style="grid-template-columns:repeat(${etapas.length},1fr)" aria-hidden="true">${etapas.map((_, i) => `<span class="${i < idx ? 'feito' : i === idx ? 'atual' : ''}"></span>`).join('')}</div>
        <div class="p-progresso__legenda"><span>Etapa ${idx + 1} de ${etapas.length}</span><span>${idx + 1 < etapas.length ? 'Próxima: ' + esc(PF.statusOf(etapas[idx + 1]).label) : ''}</span></div>
        <div class="p-prev">${ICON_CAL}<div>${os.status === 'entregue' ? `<b>Entregue em ${fmt.date(os.entrega)}</b><span>Obrigado pela confiança</span>` : `<b>${new Date(os.previsao).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</b><span>Previsão de entrega</span>`}</div></div>
      </section>

      ${os.status === 'aprovacao' ? blocoAprovacao(os, t, seg) : blocoServicos(os, t, seg)}
      ${blocoFotos(os)}
      ${blocoDocumentos(os)}
      ${blocoChegada(os)}
      ${blocoAtualizacoes(os)}

      <p class="p-rodape">Paint Forza, funilaria, pintura e estética automotiva em Belém.<br><a href="index.html">Conheça a oficina</a></p>
      <a class="p-btn p-zap" href="${zap}" target="_blank" rel="noopener">${ZAP}Falar com a oficina</a>`;

    ligar(os, seg);
  }

  // ---------- blocos ----------
  function blocoAprovacao(os, t, seg) {
    const marcados = os.itens.filter((i) => escolhas[i.id]);
    const bruto = marcados.reduce((s, i) => s + i.qtd * i.valor, 0);
    const total = Math.max(0, bruto - (os.desconto || 0));
    const franquia = seg ? Math.min(total, os.seguradora.franquia || 0) : total;
    return `<section class="p-cartao" id="orcamento">
      <h2>Seu orçamento</h2>
      <p class="p-sub">Desmarque o que quiser deixar para depois. Você aprova só o que fizer sentido agora.</p>
      <ul class="p-itens">${os.itens.map((i) => `<li class="p-item ${escolhas[i.id] ? '' : 'is-fora'}">
        <div><b>${esc(i.descricao)}</b><small>${i.tipo === 'peca' ? 'Peça' : 'Serviço'}${i.qtd > 1 ? `, ${i.qtd} unidades` : ''}</small></div>
        <span class="p-item__valor">${fmt.money(i.qtd * i.valor)}</span>
        <label class="p-chave"><input type="checkbox" data-escolha="${i.id}" ${escolhas[i.id] ? 'checked' : ''} aria-label="Aprovar ${esc(i.descricao)}"><span></span></label>
      </li>`).join('')}</ul>
      <div class="p-resumo">
        ${os.desconto ? `<div><span>Desconto</span><span>− ${fmt.money(os.desconto)}</span></div>` : ''}
        <div class="p-total"><span>Total aprovado</span><span>${fmt.money(total)}</span></div>
        ${seg ? `<div><span>Você paga (franquia)</span><span>${fmt.money(franquia)}</span></div><div><span>${esc(os.seguradora.nome)} paga</span><span>${fmt.money(total - franquia)}</span></div>` : ''}
      </div>
      <div class="p-acoes">
        <button class="p-btn" type="button" id="btnAprovar" ${marcados.length ? '' : 'disabled'}>${marcados.length ? `Aprovar ${marcados.length === os.itens.length ? 'orçamento' : `${marcados.length} de ${os.itens.length} itens`}` : 'Escolha ao menos um item'}</button>
        <a class="p-btn p-btn--claro" href="${PF.waLink(PF.OFICINA.whatsapp, `Olá! Tenho uma dúvida sobre o orçamento da OS ${os.numero}.`)}" target="_blank" rel="noopener">Tirar dúvidas antes</a>
      </div>
      <p class="p-nota">Orçamento válido por 10 dias. A previsão de entrega conta a partir da aprovação.</p>
    </section>`;
  }

  function blocoServicos(os, t, seg) {
    const ativos = os.itens.filter(PF.itemAtivo), fora = os.itens.filter((i) => !PF.itemAtivo(i));
    if (!PF.aprovada(os)) return `<section class="p-cartao"><h2>Orçamento</h2><p class="p-sub">A oficina está montando o orçamento do seu carro. Você recebe o link para aprovar assim que ficar pronto.</p></section>`;
    return `<section class="p-cartao">
      <h2>Serviços</h2>
      <p class="p-sub">O que está sendo feito no seu carro.</p>
      <ul class="p-lista">${ativos.map((i) => `<li><span>${esc(i.descricao)}</span><span>${fmt.money(i.qtd * i.valor)}</span></li>`).join('')}</ul>
      ${fora.length ? `<p class="p-nota">Ficou para depois: ${fora.map((i) => esc(i.descricao.toLowerCase())).join(', ')}. É só chamar quando quiser agendar.</p>` : ''}
      <div class="p-valores">
        <div><span>Total do serviço</span><strong>${fmt.money(t.total)}</strong></div>
        <div><span>Já pago</span><strong>${fmt.money(seg ? t.pagoCliente : t.pago)}</strong></div>
        ${seg ? `<div class="destaque"><span>Sua parte (franquia)</span><strong>${t.saldoCliente ? 'Falta ' + fmt.money(t.saldoCliente) : 'Paga'}</strong></div><div><span>${esc(os.seguradora.nome)}</span><strong>${fmt.money(t.parteSeguradora)}</strong></div>`
          : `<div class="destaque largo"><span>${t.saldo ? 'Falta pagar' : 'Situação'}</span><strong>${t.saldo ? fmt.money(t.saldo) : 'Tudo pago'}</strong></div>`}
      </div>
    </section>`;
  }

  function blocoFotos(os) {
    const fotos = (os.fotosEtapas || []).slice().sort((a, b) => new Date(a.data) - new Date(b.data));
    const antes = os.entrada.fotos[0], depois = os.saida.fotos[0];
    const pronto = ['pronto', 'entregue'].includes(os.status);
    if (!fotos.length && !(pronto && antes && depois)) return '';
    return `<section class="p-cartao">
      ${pronto && antes && depois ? `<h2>Antes e depois</h2><p class="p-sub">Como seu carro chegou e como ficou.</p>
        <div class="p-antesdepois"><figure><img src="${antes}" alt="Antes" data-foto="Entrada, ${fmt.date(os.entrada.data)}"><figcaption>Antes</figcaption></figure><figure><img src="${depois}" alt="Depois" data-foto="Entrega"><figcaption>Depois</figcaption></figure></div>` : ''}
      ${fotos.length ? `<h2 ${pronto && antes && depois ? 'style="margin-top:22px"' : ''}>Fotos do serviço</h2><p class="p-sub">Registradas pela equipe em cada etapa.</p>
        <div class="p-fotos">${fotos.map((f) => { const s = PF.statusOf(f.etapa); return `<figure style="--c:${s.color}"><img src="${f.src}" alt="${esc(s.label)}" data-foto="${esc(s.label)}, ${fmt.dateTime(f.data)}" loading="lazy"><figcaption><i></i><b>${esc(s.label)}</b>${fmt.dateShort(f.data)}</figcaption></figure>`; }).join('')}</div>` : ''}
    </section>`;
  }

  function blocoDocumentos(os) {
    const pronto = ['pronto', 'entregue'].includes(os.status);
    const docs = [
      ['orcamento', 'Orçamento', 'Serviços, valores e condições'],
      ['laudo', 'Laudo de vistoria', 'Como o carro chegou, com fotos'],
      ...(pronto ? [['termo', 'Termo de entrega', 'Checklist de qualidade'], ['garantia', 'Certificado de garantia', 'Prazos de garantia dos serviços']] : []),
      ...os.pagamentos.map((p, i) => [`recibo:${p.id}`, `Recibo ${i + 1}`, `${fmt.money(p.valor)} em ${fmt.date(p.data)}`]),
    ];
    return `<section class="p-cartao"><h2>Documentos</h2><p class="p-sub">Em PDF, com a marca da Paint Forza.</p>
      <div class="p-docs">${docs.map(([k, n, d]) => `<button type="button" data-doc="${k}">${ICON_DOC}<span><b>${n}</b><small>${d}</small></span><span class="p-baixar">Baixar PDF</span></button>`).join('')}</div></section>`;
  }

  function blocoChegada(os) {
    const e = os.entrada;
    return `<section class="p-cartao"><h2>Como seu carro chegou</h2><p class="p-sub">Vistoria de ${fmt.date(e.data)}${e.km ? `, ${e.km.toLocaleString('pt-BR')} km` : ''}.</p>
      <div class="p-vistoria"><div>${PF.diagramSVG(e.avarias)}</div>
        <div>${e.avarias.length ? `<ul class="p-avarias">${e.avarias.map((a) => { const T = PF.AVARIAS.find((x) => x.id === a.tipo) || {}; return `<li><i style="background:${T.cor}"></i><span><b>${esc(PF.nomePeca(a.peca))}</b>: ${esc((T.label || '').toLowerCase())}</span></li>`; }).join('')}</ul>` : '<p class="p-sub">Nenhuma avaria registrada.</p>'}</div></div>
      ${e.fotos.length ? `<div class="p-miniaturas">${e.fotos.map((f) => `<img src="${f}" alt="Foto de entrada" data-foto="Entrada, ${fmt.date(e.data)}" loading="lazy">`).join('')}</div>` : ''}
    </section>`;
  }

  function blocoAtualizacoes(os) {
    const hist = os.historico.filter((h) => h.status || h.publica);
    return `<section class="p-cartao"><h2>Atualizações</h2><p class="p-sub">Tudo o que aconteceu até agora.</p>
      <ul class="p-hist">${hist.map((h) => `<li style="--c:${h.status ? PF.statusOf(h.status).color : 'var(--texto-2)'}"><time>${fmt.dateTime(h.data)}</time>${h.status ? `<b>${esc(PF.statusOf(h.status).label)}</b>` : ''}${h.nota ? `<div>${esc(h.nota)}</div>` : ''}</li>`).join('')}</ul></section>`;
  }

  // ---------- interação ----------
  function ligar(os, seg) {
    $$('[data-escolha]', el).forEach((cb) => cb.addEventListener('change', () => {
      escolhas[cb.dataset.escolha] = cb.checked;
      const y = scrollY; render(); scrollTo(0, y);
    }));
    const btn = $('#btnAprovar', el);
    if (btn) btn.onclick = () => confirmarAprovacao(os, seg);
    $$('[data-foto]', el).forEach((img) => img.addEventListener('click', () => abrirFolha(`<img src="${img.src}" alt=""><p>${esc(img.dataset.foto)}</p>`, 'is-foto')));
    $$('[data-doc]', el).forEach((b) => b.addEventListener('click', () => baixarDoc(os, b)));
  }

  function confirmarAprovacao(os, seg) {
    const marcados = os.itens.filter((i) => escolhas[i.id]), fora = os.itens.filter((i) => !escolhas[i.id]);
    const total = Math.max(0, marcados.reduce((s, i) => s + i.qtd * i.valor, 0) - (os.desconto || 0));
    const franquia = seg ? Math.min(total, os.seguradora.franquia || 0) : total;
    abrirFolha(`<h2>Confirmar aprovação</h2>
      <p class="p-sub">${marcados.length} ${marcados.length === 1 ? 'item aprovado' : 'itens aprovados'}${fora.length ? `, ${fora.length} para depois` : ''}.</p>
      <ul class="p-lista">${marcados.map((i) => `<li><span>${esc(i.descricao)}</span><span>${fmt.money(i.qtd * i.valor)}</span></li>`).join('')}</ul>
      <div class="p-resumo"><div class="p-total"><span>Total</span><span>${fmt.money(total)}</span></div>${seg ? `<div><span>Você paga (franquia)</span><span>${fmt.money(franquia)}</span></div>` : ''}</div>
      <div class="p-acoes"><button class="p-btn" type="button" id="btnConfirmar">Confirmar e liberar o serviço</button><button class="p-btn p-btn--claro" type="button" data-fechar>Voltar</button></div>`);
    $('#btnConfirmar', caixa).onclick = () => {
      os.itens.forEach((i) => { i.status = escolhas[i.id] ? 'aprovado' : 'recusado'; });
      const nota = fora.length ? `Cliente aprovou ${marcados.length} de ${os.itens.length} itens pelo link. Ficou para depois: ${fora.map((i) => i.descricao).join(', ')}.` : 'Cliente aprovou o orçamento completo pelo link de acompanhamento.';
      PF.setStatus(os, PF.proximaEtapa(os), nota);
      escolhas = null; aprovadoAgora = true;
      fecharFolha(); render(); scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  async function baixarDoc(os, botao) {
    if (!window.html2pdf) { aviso('Aguarde um instante e tente de novo.'); return; }
    const [tipo, pagId] = botao.dataset.doc.split(':');
    const v = PF.find.veiculo(os.veiculoId) || {};
    const html = tipo === 'recibo' ? PFDocs.recibo(os, os.pagamentos.find((p) => p.id === pagId)) : PFDocs.TIPOS[tipo].fn(os);
    const nomeDoc = tipo === 'recibo' ? 'Recibo' : PFDocs.TIPOS[tipo].nome;
    const etiqueta = $('.p-baixar', botao), antes = etiqueta.textContent;
    botao.disabled = true; etiqueta.textContent = 'Gerando…';
    const area = document.createElement('div');
    area.style.cssText = 'position:fixed;left:-10000px;top:0';
    area.innerHTML = html;
    document.body.appendChild(area);
    try {
      PFDocs.prepararQR(area);
      await PFDocs.baixar(area.firstElementChild, `${nomeDoc} OS ${os.numero} ${v.placa}.pdf`);
      aviso('PDF baixado.');
    } catch (err) {
      console.error(err); aviso('Não foi possível gerar o PDF agora.');
    } finally {
      area.remove(); botao.disabled = false; etiqueta.textContent = antes;
    }
  }

  window.addEventListener('storage', (e) => { if (e.key === PF.KEY && folha.hidden) { PF.load(); render(); } });
  render();
})();
