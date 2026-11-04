/* PAINT FORZA — documentos em PDF com a marca (orçamento, laudo, recibo, garantia, termo e lista de compras).
   Cada documento é uma folha A4 em HTML; o html2pdf transforma em PDF para baixar ou enviar. */
(function () {
  const { fmt, esc } = PF;
  const db = () => PF.db;
  const veic = (os) => PF.find.veiculo(os.veiculoId) || {};
  const cli = (os) => PF.find.cliente(os.clienteId) || {};
  const agora = () => new Date().toISOString();
  const dataLonga = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const somaMeses = (iso, m) => { const d = new Date(iso); d.setMonth(d.getMonth() + m); return d.toISOString(); };

  function folha(titulo, sub, conteudo) {
    const o = db().oficina;
    return `<article class="pdf">
      <header class="pdf__cab">
        <img src="assets/img/logo-preto.png" alt="Paint Forza">
        <div class="pdf__titulo"><h1>${esc(titulo)}</h1>${sub.map((s) => `<p>${s}</p>`).join('')}</div>
      </header>
      <p class="pdf__empresa">Funilaria, pintura e estética automotiva. ${esc(o.endereco)}. WhatsApp ${PF.OFICINA.whatsappFmt}. Instagram @${PF.OFICINA.instagram}</p>
      ${conteudo}
      <footer class="pdf__rodape"><span>Paint Forza</span><span>Documento gerado em ${fmt.dateTime(agora())}</span></footer>
    </article>`;
  }

  function partes(os, extra = '') {
    const v = veic(os), c = cli(os);
    return `<section class="pdf__partes pdf-bloco">
      <div><h3>Cliente</h3><p class="pdf__forte">${esc(c.nome)}</p><p>${esc(c.telefone)}${c.email ? `<br>${esc(c.email)}` : ''}</p></div>
      <div><h3>Veículo</h3><div class="pdf__carro">${PF.plate(v.placa)}<div><p class="pdf__forte">${esc(v.marca)} ${esc(v.modelo)}</p><p>${v.ano}, ${esc(v.cor)}${extra}</p></div></div></div>
    </section>`;
  }

  function blocoSeguradora(os, t) {
    if (!PF.temSeguradora(os)) return '';
    const s = os.seguradora;
    return `<section class="pdf__seguro pdf-bloco"><h3>Sinistro ${esc(os.sinistro || '')}, ${esc(s.nome)}</h3>
      <div class="pdf__linhas"><div><span>Franquia, paga pelo cliente</span><b>${fmt.money(t.parteCliente)}</b></div><div><span>Parte da seguradora</span><b>${fmt.money(t.parteSeguradora)}</b></div><div><span>Situação</span><b>${esc(PF.AUTORIZACAO[s.autorizacao] || '')}</b></div></div></section>`;
  }

  function tabelaItens(os, t, { mostrarRecusados = true } = {}) {
    const itens = os.itens.filter((i) => mostrarRecusados || PF.itemAtivo(i));
    return `<table class="pdf__tabela"><thead><tr><th>Descrição</th><th class="r">Qtd.</th><th class="r">Unitário</th><th class="r">Total</th></tr></thead><tbody>
      ${itens.map((i) => `<tr class="${PF.itemAtivo(i) ? '' : 'recusado'}"><td>${esc(i.descricao)} <span class="pdf__tag">${i.tipo === 'peca' ? 'Peça' : 'Serviço'}</span>${PF.itemAtivo(i) ? '' : ' <span class="pdf__tag pdf__tag--off">Não aprovado</span>'}</td><td class="r">${i.qtd}</td><td class="r">${fmt.money(i.valor)}</td><td class="r">${fmt.money(i.qtd * i.valor)}</td></tr>`).join('')}
    </tbody></table>
    <div class="pdf__totais">
      <div><span>Subtotal</span><span>${fmt.money(t.bruto)}</span></div>
      ${os.desconto ? `<div><span>Desconto</span><span>− ${fmt.money(os.desconto)}</span></div>` : ''}
      <div class="pdf__total"><span>Total</span><span>${fmt.money(t.total)}</span></div>
    </div>`;
  }

  // ---------- documentos ----------
  function orcamento(os) {
    const t = PF.totais(os);
    const garantias = os.itens.filter((i) => PF.itemAtivo(i) && i.tipo === 'servico').map((i) => ({ i, g: PF.garantiaDe(i.descricao, db().garantias) })).filter((x) => x.g);
    const validade = new Date(Date.now() + 10 * PF.DAY).toISOString();
    return folha('Orçamento', [`OS ${os.numero}`, `Emitido em ${fmt.date(agora())}`], `
      ${partes(os)}
      ${os.relato ? `<section class="pdf-bloco"><h3>O que foi relatado</h3><p>${esc(os.relato)}</p></section>` : ''}
      <section class="pdf-bloco"><h3>Serviços e peças</h3>${tabelaItens(os, t)}</section>
      ${blocoSeguradora(os, t)}
      <section class="pdf__duas pdf-bloco">
        <div><h3>Condições</h3><ul class="pdf__lista">
          <li>Orçamento válido até ${fmt.date(validade)}.</li>
          <li>Previsão de entrega: ${fmt.date(os.previsao)}, contada a partir da aprovação.</li>
          <li>Pagamento por Pix, cartão ou dinheiro. Entrada de 50% na aprovação.</li>
          ${garantias.length ? `<li>Garantia: ${garantias.map((x) => `${esc(x.g.chave.toLowerCase())}, ${x.g.meses} meses`).filter((v, k, a) => a.indexOf(v) === k).join('; ')}.</li>` : ''}
        </ul></div>
        <div class="pdf__aprovar"><div class="pdf__qr" data-qr="${esc(PF.portalUrl(os))}"></div><div><h3>Aprove pelo celular</h3><p>Aponte a câmera para o código, ou use a OS <b>${os.numero}</b> e o código <b>${esc(os.codigo)}</b> no site da Paint Forza.</p></div></div>
      </section>
      <section class="pdf__assin pdf-bloco"><div>Paint Forza</div><div>Cliente, de acordo</div></section>`);
  }

  function laudo(os) {
    const e = os.entrada;
    const itens = PF.ITENS_ENTRADA.map((i) => `<li class="${e.itens[i] ? 'sim' : 'nao'}">${esc(i)}</li>`).join('');
    return folha('Laudo de vistoria', [`OS ${os.numero}`, `Entrada em ${fmt.dateTime(e.data)}`], `
      ${partes(os, `<br>${e.km ? e.km.toLocaleString('pt-BR') + ' km' : 'km não informado'}, combustível ${e.combustivel}/8`)}
      <section class="pdf__vistoria pdf-bloco">
        <div>${PF.diagramSVG(e.avarias)}</div>
        <div><h3>Avarias registradas (${e.avarias.length})</h3>
          ${e.avarias.length ? `<ol class="pdf__avarias">${e.avarias.map((a) => { const tp = PF.AVARIAS.find((x) => x.id === a.tipo) || {}; return `<li><i style="background:${tp.cor}"></i><span><b>${esc(PF.nomePeca(a.peca))}</b>: ${esc(tp.label)}${a.obs ? `. ${esc(a.obs)}` : ''}</span></li>`; }).join('')}</ol>` : '<p>Nenhuma avaria registrada.</p>'}
          <div class="pdf__legenda">${PF.AVARIAS.map((a) => `<span><i style="background:${a.cor}"></i>${a.label}</span>`).join('')}</div>
        </div>
      </section>
      <section class="pdf-bloco"><h3>Itens no carro</h3><ul class="pdf__check">${itens}</ul></section>
      ${e.obs ? `<section class="pdf-bloco"><h3>Observações</h3><p>${esc(e.obs)}</p></section>` : ''}
      ${e.fotos.length ? `<section class="pdf-bloco"><h3>Fotos de entrada</h3><div class="pdf__fotos">${e.fotos.slice(0, 6).map((f) => `<figure><img src="${f}" alt=""></figure>`).join('')}</div></section>` : ''}
      <section class="pdf__assin pdf-bloco"><div>${e.assinatura ? `<img src="${e.assinatura}" alt="">` : ''}Cliente</div><div>Paint Forza, vistoria</div></section>
      <p class="pdf__miudo">O cliente declara que as avarias acima conferem com o estado do veículo na entrada. Objetos pessoais deixados no veículo são de responsabilidade do proprietário.</p>`);
  }

  function recibo(os, pagamento) {
    const t = PF.totais(os), v = veic(os), c = cli(os);
    const pagador = pagamento.forma === 'Seguradora' && os.seguradora ? os.seguradora.nome : c.nome;
    const n = os.pagamentos.indexOf(pagamento) + 1;
    return folha('Recibo', [`Nº ${os.numero}-${n}`, fmt.date(pagamento.data)], `
      <section class="pdf__valor pdf-bloco"><span>Valor recebido</span><strong>${fmt.money(pagamento.valor)}</strong></section>
      <section class="pdf-bloco pdf__texto">
        <p>Recebemos de <b>${esc(pagador)}</b> a importância de <b>${fmt.money(pagamento.valor)}</b> (${esc(PF.extenso(pagamento.valor))}), referente ${pagamento.obs ? 'a ' + esc(pagamento.obs.toLowerCase()) + ' da' : 'à'} ordem de serviço <b>${os.numero}</b>, veículo ${esc(v.marca)} ${esc(v.modelo)}, placa ${esc(v.placa)}, pago via ${esc(pagamento.forma.toLowerCase())}.</p>
      </section>
      <section class="pdf-bloco"><h3>Situação da OS</h3><div class="pdf__linhas">
        <div><span>Total da OS</span><b>${fmt.money(t.total)}</b></div>
        <div><span>Total pago até agora</span><b>${fmt.money(t.pago)}</b></div>
        <div><span>Saldo</span><b>${fmt.money(Math.max(0, t.total - t.pago))}</b></div>
      </div></section>
      <p class="pdf__local">Belém, ${dataLonga(pagamento.data)}.</p>
      <section class="pdf__assin pdf__assin--uma pdf-bloco"><div>Paint Forza</div></section>`);
  }

  function garantia(os) {
    const base = os.entrega || os.saida.data || agora();
    const linhas = os.itens.filter((i) => PF.itemAtivo(i)).map((i) => {
      if (i.tipo === 'peca') return `<tr><td>${esc(i.descricao)}</td><td>Do fabricante</td><td>—</td></tr>`;
      const g = PF.garantiaDe(i.descricao, db().garantias);
      return g ? `<tr><td>${esc(i.descricao)}</td><td>${g.meses} meses</td><td>${fmt.date(somaMeses(base, g.meses))}</td></tr>` : `<tr><td>${esc(i.descricao)}</td><td>90 dias</td><td>${fmt.date(somaMeses(base, 3))}</td></tr>`;
    }).join('');
    return folha('Certificado de garantia', [`OS ${os.numero}`, `Entrega em ${fmt.date(base)}`], `
      ${partes(os)}
      <section class="pdf-bloco pdf__texto"><p>A Paint Forza garante os serviços abaixo, executados no veículo identificado, pelos prazos indicados a partir da data de entrega.</p></section>
      <section class="pdf-bloco"><table class="pdf__tabela"><thead><tr><th>Serviço ou peça</th><th>Garantia</th><th>Válida até</th></tr></thead><tbody>${linhas}</tbody></table></section>
      <section class="pdf-bloco"><h3>Condições</h3><ul class="pdf__lista">
        <li>Cobre defeitos de execução, como descascamento, bolhas, diferença de tonalidade e falhas de aplicação.</li>
        <li>Não cobre danos causados por batidas, granizo, produtos químicos, lavagens com produtos abrasivos ou reparos feitos por terceiros.</li>
        <li>Vitrificação e PPF exigem manutenção a cada 6 meses para manter a garantia.</li>
        <li>Para acionar, apresente este certificado e agende uma avaliação pelo WhatsApp ${PF.OFICINA.whatsappFmt}.</li>
      </ul></section>
      <p class="pdf__local">Belém, ${dataLonga(base)}.</p>
      <section class="pdf__assin pdf__assin--uma pdf-bloco"><div>Paint Forza</div></section>`);
  }

  function termo(os) {
    const s = os.saida, t = PF.totais(os);
    const antes = os.entrada.fotos[0], depois = s.fotos[0];
    return folha('Termo de entrega', [`OS ${os.numero}`, fmt.dateTime(os.entrega || s.data || agora())], `
      ${partes(os, `<br>Km na entrada ${os.entrada.km ? os.entrada.km.toLocaleString('pt-BR') : '—'}, na saída ${s.km ? s.km.toLocaleString('pt-BR') : '—'}`)}
      <section class="pdf-bloco"><h3>Serviços realizados</h3><ul class="pdf__lista">${os.itens.filter(PF.itemAtivo).map((i) => `<li>${esc(i.descricao)}</li>`).join('')}</ul></section>
      <section class="pdf-bloco"><h3>Checklist de qualidade</h3><ul class="pdf__check">${PF.CHECK_SAIDA.map((i) => `<li class="${s.checklist[i] ? 'sim' : 'nao'}">${esc(i)}</li>`).join('')}</ul></section>
      ${antes && depois ? `<section class="pdf-bloco"><h3>Antes e depois</h3><div class="pdf__antesdepois"><figure><img src="${antes}" alt=""><figcaption>Entrada</figcaption></figure><figure><img src="${depois}" alt=""><figcaption>Entrega</figcaption></figure></div></section>` : ''}
      <section class="pdf-bloco"><h3>Valores</h3><div class="pdf__linhas"><div><span>Total da OS</span><b>${fmt.money(t.total)}</b></div><div><span>Pago</span><b>${fmt.money(t.pago)}</b></div><div><span>Saldo</span><b>${fmt.money(Math.max(0, t.total - t.pago))}</b></div></div></section>
      ${s.obs ? `<section class="pdf-bloco"><h3>Orientações</h3><p>${esc(s.obs)}</p></section>` : ''}
      <section class="pdf__assin pdf-bloco"><div>${s.assinatura ? `<img src="${s.assinatura}" alt="">` : ''}Cliente, recebi o veículo</div><div>Paint Forza</div></section>`);
  }

  function compras(itens) {
    let total = 0;
    const linhas = itens.map((e) => {
      const comprar = Math.max(e.minimo * 2 - e.qtd, e.minimo - e.qtd, 1);
      total += comprar * e.custo;
      return `<tr><td>${esc(e.nome)}<br><span class="pdf__miudo">${esc(e.fornecedor || '')}</span></td><td class="r">${fmtQtd(e.qtd)} ${esc(e.unidade)}</td><td class="r">${fmtQtd(e.minimo)}</td><td class="r"><b>${fmtQtd(comprar)} ${esc(e.unidade)}</b></td><td class="r">${fmt.money(comprar * e.custo)}</td></tr>`;
    }).join('');
    return folha('Lista de compras', [fmt.date(agora())], `
      <section class="pdf-bloco pdf__texto"><p>Itens abaixo do estoque mínimo. A sugestão repõe o dobro do mínimo.</p></section>
      <section class="pdf-bloco"><table class="pdf__tabela"><thead><tr><th>Item</th><th class="r">Em estoque</th><th class="r">Mínimo</th><th class="r">Comprar</th><th class="r">Estimado</th></tr></thead><tbody>${linhas}</tbody></table>
      <div class="pdf__totais"><div class="pdf__total"><span>Total estimado</span><span>${fmt.money(total)}</span></div></div></section>`);
  }
  const fmtQtd = (q) => Number(q).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  const TIPOS = {
    orcamento: { nome: 'Orçamento', fn: orcamento },
    laudo: { nome: 'Laudo de vistoria', fn: laudo },
    garantia: { nome: 'Certificado de garantia', fn: garantia },
    termo: { nome: 'Termo de entrega', fn: termo },
  };

  // ---------- PDF ----------
  function prepararQR(raiz) {
    raiz.querySelectorAll('[data-qr]').forEach((el) => {
      if (el.childElementCount || !window.QRCode) return;
      new QRCode(el, { text: el.dataset.qr, width: 208, height: 208, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      // A biblioteca cria um <img> que carrega depois; troca já por uma imagem pronta para o PDF não esperar por ela.
      const cv = el.querySelector('canvas');
      if (cv) { const img = new Image(); img.src = cv.toDataURL('image/png'); img.alt = 'QR Code para aprovar o orçamento'; el.replaceChildren(img); }
    });
  }
  const carregarImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  // O html2canvas não desenha bem SVG embutido nem respeita object-fit; antes de gerar o PDF
  // o diagrama vira PNG e cada foto é recortada no formato da moldura.
  async function rasterizar(raiz) {
    for (const svg of raiz.querySelectorAll('svg.diagrama')) {
      const clone = svg.cloneNode(true);
      const w = 570, h = Math.round((w * 490) / 260);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', w); clone.setAttribute('height', h);
      clone.querySelectorAll('.peca').forEach((p) => { p.setAttribute('stroke', '#1d1d1f'); p.setAttribute('stroke-width', '1.5'); if (!p.classList.contains('tem')) p.setAttribute('fill', '#f5f5f7'); });
      const img = await carregarImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone)));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      const novo = document.createElement('img');
      novo.src = cv.toDataURL('image/png'); novo.className = 'diagrama'; novo.alt = 'Diagrama de avarias';
      await novo.decode();
      svg.replaceWith(novo);
    }
    for (const img of raiz.querySelectorAll('.pdf__fotos img, .pdf__antesdepois img')) {
      if (img.dataset.pronta) continue;
      const fonte = await carregarImg(img.src);
      const W = 640, H = 480, k = Math.max(W / fonte.width, H / fonte.height);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      cv.getContext('2d').drawImage(fonte, (W - fonte.width * k) / 2, (H - fonte.height * k) / 2, fonte.width * k, fonte.height * k);
      img.src = cv.toDataURL('image/jpeg', 0.88); img.dataset.pronta = '1';
      await img.decode();
    }
  }
  // A4 tem 1123 px de altura nesta largura. Se o conteúdo passar um pouco, compacta; se passar muito, usa páginas inteiras.
  const FOLHA = 1122;
  function encaixar(el) {
    el.classList.remove('pdf--compacto', 'pdf--mini');
    el.style.minHeight = '0';
    for (const classes of [[], ['pdf--compacto'], ['pdf--compacto', 'pdf--mini']]) {
      el.classList.remove('pdf--compacto', 'pdf--mini');
      el.classList.add(...classes);
      if (el.scrollHeight <= FOLHA - 4) { el.style.minHeight = `${FOLHA - 4}px`; return; }
    }
    el.classList.remove('pdf--mini');
    el.style.minHeight = `${Math.ceil(el.scrollHeight / FOLHA) * FOLHA - 4}px`;
  }
  async function pdfBlob(el) {
    await rasterizar(el);
    encaixar(el);
    return html2pdf().set({
      margin: 0,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-bloco', 'tr'] },
    }).from(el).outputPdf('blob');
  }
  async function baixar(el, nome) {
    const blob = await pdfBlob(el);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return blob;
  }
  // No celular abre o compartilhamento (WhatsApp aparece na lista); no computador baixa e abre a conversa.
  async function enviar(el, nome, telefone, mensagem) {
    const blob = await pdfBlob(el);
    const arquivo = new File([blob], nome, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo], title: nome, text: mensagem });
      return 'compartilhado';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    window.open(PF.waLink(telefone, mensagem), '_blank', 'noopener');
    return 'baixado';
  }

  window.PFDocs = { TIPOS, orcamento, laudo, recibo, garantia, termo, compras, prepararQR, pdfBlob, baixar, enviar };
})();
