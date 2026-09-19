(function () {
  'use strict';

  /* --- Barra de navegação: estado ao rolar --- */
  var topo = document.getElementById('topo');
  var tickTopoAgendado = false;

  function atualizarTopo() {
    topo.classList.toggle('rolou', window.scrollY > 40);
    tickTopoAgendado = false;
  }

  function pedirAtualizacaoTopo() {
    if (!tickTopoAgendado) {
      tickTopoAgendado = true;
      requestAnimationFrame(atualizarTopo);
    }
  }

  atualizarTopo();
  window.addEventListener('scroll', pedirAtualizacaoTopo, { passive: true });

  /* --- Menu mobile --- */
  var menuToggle = document.getElementById('menu-toggle');
  var navLinks = document.getElementById('nav-links');

  function fecharMenu() {
    navLinks.classList.remove('aberto');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  menuToggle.addEventListener('click', function () {
    var aberto = navLinks.classList.toggle('aberto');
    menuToggle.setAttribute('aria-expanded', String(aberto));
  });

  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', fecharMenu);
  });

  /* --- Barra de progresso de leitura --- */
  var barraProgresso = document.getElementById('progresso-scroll');
  var tickAgendado = false;

  function atualizarProgresso() {
    var alturaTotal = document.documentElement.scrollHeight - window.innerHeight;
    var progresso = alturaTotal > 0 ? window.scrollY / alturaTotal : 0;
    barraProgresso.style.transform = 'scaleX(' + progresso + ')';
    tickAgendado = false;
  }

  function pedirAtualizacaoProgresso() {
    if (!tickAgendado) {
      tickAgendado = true;
      requestAnimationFrame(atualizarProgresso);
    }
  }

  atualizarProgresso();
  window.addEventListener('scroll', pedirAtualizacaoProgresso, { passive: true });
  window.addEventListener('resize', pedirAtualizacaoProgresso);

  /* --- Dados dos roteiros --- */
  var roteiros = {
    roma: {
      local: 'Itália',
      titulo: 'Roma',
      subtitulo: 'O coração do Império, revisitado sem pressa.',
      imagem: 'imagens/tours/ColosseumRomaTour.jpg',
      duracao: '5 dias',
      epoca: 'Abril–Junho e Setembro–Outubro',
      descricao: 'Roma não se vê em uma tarde. Por isso entramos no Coliseu antes da abertura ' +
        'oficial, caminhamos pelo Fórum Romano com um arqueólogo local e deixamos as tardes ' +
        'livres para perder-se em Trastevere. É história vivida em ritmo de bairro, não de fila.',
      destaques: [
        'Acesso antecipado ao Coliseu e à Arena, antes dos grupos grandes',
        'Caminhada guiada pelo Fórum Romano e Monte Palatino',
        'Jantar em trattoria familiar em Trastevere',
        'Tarde livre para a Cidade do Vaticano e Capela Sistina'
      ]
    },
    estocolmo: {
      local: 'Suécia',
      titulo: 'Estocolmo',
      subtitulo: 'Catorze ilhas, uma luz que não quer se apagar.',
      imagem: 'imagens/tours/EstocolmoSueciaTour.jpg',
      duracao: '6 dias',
      epoca: 'Junho–Agosto, no auge do verão nórdico',
      descricao: 'No verão, o sol quase não se põe sobre o arquipélago de Estocolmo. Navegamos ' +
        'entre as ilhas, exploramos os becos medievais de Gamla Stan e reservamos uma noite para ' +
        'nada além de assistir o céu ficar dourado às 22h.',
      destaques: [
        'Passeio de barco pelo arquipélago com parada em ilha habitada',
        'Caminhada histórica por Gamla Stan, a cidade velha',
        'Visita ao museu do navio Vasa, intacto desde o século XVII',
        'Noite de sol da meia-noite em mirante reservado'
      ]
    },
    paris: {
      local: 'França',
      titulo: 'Paris',
      subtitulo: 'A cidade que insiste em ser vivida devagar.',
      imagem: 'imagens/tours/ParisFrancaTour.jpg',
      duracao: '5 dias',
      epoca: 'Abril–Junho e Setembro–Outubro',
      descricao: 'Evitamos o roteiro de cartão-postal apressado. Um piquenique ao pôr do sol de ' +
        'frente para a Torre Eiffel, uma manhã inteira no Louvre com entrada reservada e tardes ' +
        'livres para se perder nas ladeiras de Montmartre — esse é o compasso da viagem.',
      destaques: [
        'Piquenique ao entardecer com vista para a Torre Eiffel',
        'Entrada reservada e visita guiada ao Museu do Louvre',
        'Passeio de barco ao anoitecer pelo Rio Sena',
        'Manhã livre entre ateliês e escadarias de Montmartre'
      ]
    },
    rio: {
      local: 'Brasil',
      titulo: 'Rio de Janeiro',
      subtitulo: 'Sol, mar e serra, tudo antes do almoço.',
      imagem: 'imagens/tours/RioBrasilTour.jpg',
      duracao: '4 dias',
      epoca: 'Setembro–Março',
      descricao: 'Subimos ao Cristo Redentor ainda de madrugada para ver o Rio acordar sob a luz ' +
        'dourada do sol, descemos para o teleférico do Pão de Açúcar e fechamos os dias entre a ' +
        'areia de Ipanema e a trilha da Floresta da Tijuca.',
      destaques: [
        'Nascer do sol no Cristo Redentor, antes da abertura ao público',
        'Teleférico do Pão de Açúcar ao entardecer',
        'Trilha guiada na Floresta da Tijuca',
        'Tarde livre nas praias de Ipanema e Copacabana'
      ]
    }
  };

  /* --- Painel lateral de roteiro --- */
  var painelOverlay = document.getElementById('painel-overlay');
  var painel = document.getElementById('painel-roteiro');
  var painelFechar = document.getElementById('painel-fechar');
  var ultimoFoco = null;

  function abrirPainel(chave) {
    var dados = roteiros[chave];
    if (!dados) return;

    document.getElementById('painel-imagem').src = dados.imagem;
    document.getElementById('painel-imagem').alt = dados.titulo;
    document.getElementById('painel-local').textContent = dados.local;
    document.getElementById('painel-titulo').textContent = dados.titulo;
    document.getElementById('painel-subtitulo').textContent = dados.subtitulo;
    document.getElementById('painel-duracao').textContent = dados.duracao;
    document.getElementById('painel-epoca').textContent = dados.epoca;
    document.getElementById('painel-descricao').textContent = dados.descricao;

    var listaDestaques = document.getElementById('painel-destaques');
    listaDestaques.innerHTML = '';
    dados.destaques.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      listaDestaques.appendChild(li);
    });

    ultimoFoco = document.activeElement;
    painelOverlay.hidden = false;
    painel.hidden = false;
    requestAnimationFrame(function () {
      painelOverlay.classList.add('visivel');
      painel.classList.add('visivel');
    });
    document.body.classList.add('travado');
    painelFechar.focus();
  }

  function fecharPainel() {
    painelOverlay.classList.remove('visivel');
    painel.classList.remove('visivel');
    document.body.classList.remove('travado');
    setTimeout(function () {
      painelOverlay.hidden = true;
      painel.hidden = true;
    }, 620);
    if (ultimoFoco) ultimoFoco.focus();
  }

  document.querySelectorAll('.roteiro-card').forEach(function (card) {
    card.addEventListener('click', function () {
      abrirPainel(card.getAttribute('data-roteiro'));
    });
  });

  painelFechar.addEventListener('click', fecharPainel);
  painelOverlay.addEventListener('click', fecharPainel);

  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape' && painel.classList.contains('visivel')) {
      fecharPainel();
    }
  });

  /* --- Lightbox de paisagens --- */
  var lightbox = document.getElementById('lightbox');
  var lightboxConteudo = document.getElementById('lightbox-conteudo');
  var lightboxFechar = document.getElementById('lightbox-fechar');
  var ultimoFocoLightbox = null;

  function abrirLightbox(tipo, src) {
    if (videoEmPreview) pararPreview(videoEmPreview);
    lightboxConteudo.innerHTML = '';

    if (tipo === 'video') {
      var video = document.createElement('video');
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      lightboxConteudo.appendChild(video);
    } else {
      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      lightboxConteudo.appendChild(img);
    }

    ultimoFocoLightbox = document.activeElement;
    lightbox.hidden = false;
    document.body.classList.add('travado');
    lightboxFechar.focus();
  }

  function fecharLightbox() {
    var video = lightboxConteudo.querySelector('video');
    if (video) video.pause();
    lightbox.hidden = true;
    lightboxConteudo.innerHTML = '';
    document.body.classList.remove('travado');
    if (ultimoFocoLightbox) ultimoFocoLightbox.focus();
  }

  var podeHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var videoEmPreview = null;

  function pararPreview(video) {
    video.pause();
    video.currentTime = 0;
    video.closest('.paisagem-item').classList.remove('reproduzindo');
    if (videoEmPreview === video) videoEmPreview = null;
  }

  function iniciarPreview(item, video) {
    if (videoEmPreview && videoEmPreview !== video) pararPreview(videoEmPreview);
    if (!video.src) video.src = item.getAttribute('data-src');
    video.loop = true;
    video.play().catch(function () {});
    item.classList.add('reproduzindo');
    videoEmPreview = video;
  }

  document.querySelectorAll('.paisagem-item--foto').forEach(function (item) {
    item.addEventListener('click', function () {
      abrirLightbox('foto', item.getAttribute('data-src'));
    });
  });

  document.querySelectorAll('.paisagem-item--video').forEach(function (item) {
    var video = item.querySelector('video');

    if (podeHover) {
      item.addEventListener('mouseenter', function () { iniciarPreview(item, video); });
      item.addEventListener('mouseleave', function () { pararPreview(video); });
      item.addEventListener('click', function () {
        abrirLightbox('video', item.getAttribute('data-src'));
      });
    } else {
      item.addEventListener('click', function () {
        if (video.paused) {
          if (videoEmPreview && videoEmPreview !== video) pararPreview(videoEmPreview);
          if (!video.src) video.src = item.getAttribute('data-src');
          video.controls = true;
          video.muted = false;
          video.loop = false;
          video.play().catch(function () {});
          item.classList.add('reproduzindo');
          videoEmPreview = video;
        }
      });
    }
  });

  lightboxFechar.addEventListener('click', fecharLightbox);
  lightbox.addEventListener('click', function (evento) {
    if (evento.target === lightbox) fecharLightbox();
  });

  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape' && !lightbox.hidden) {
      fecharLightbox();
    }
  });

  /* --- Ano no rodapé --- */
  var elAno = document.getElementById('ano-atual');
  if (elAno) elAno.textContent = new Date().getFullYear();

})();
