/* Site institucional: menu, links de WhatsApp e galeria */
(function () {
  document.querySelectorAll('[data-wa]').forEach((a) => {
    a.href = PF.waLink(PF.OFICINA.whatsapp, a.dataset.wa);
    a.target = '_blank';
    a.rel = 'noopener';
  });

  const nav = document.getElementById('nav');
  const menuBtn = nav.querySelector('.nav__menu');
  const fechar = () => { nav.classList.remove('is-aberto'); menuBtn.setAttribute('aria-expanded', false); document.body.style.overflow = ''; };
  menuBtn.addEventListener('click', () => {
    const aberto = nav.classList.toggle('is-aberto');
    menuBtn.setAttribute('aria-expanded', aberto);
    document.body.style.overflow = aberto ? 'hidden' : '';
  });
  nav.querySelectorAll('.nav__links a').forEach((a) => a.addEventListener('click', fechar));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });

  const galeria = document.getElementById('galeria');
  document.querySelectorAll('[data-rolar]').forEach((b) => b.addEventListener('click', () => {
    const passo = galeria.querySelector('figure').getBoundingClientRect().width + 20;
    galeria.scrollBy({ left: passo * Number(b.dataset.rolar), behavior: 'smooth' });
  }));
})();
