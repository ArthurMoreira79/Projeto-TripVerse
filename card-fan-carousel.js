/**
 * Card Fan Carousel — cartões de imagem abertos em leque, como cartas na mão. Eles entram com uma mola elástica, o
 * cartão sob o mouse sobe e afasta os vizinhos, e com mais de sete cartões as setas giram o leque um cartão por vez,
 * em círculo, com os pontos embaixo marcando o do centro.
 *
 * O tamanho dos cartões e a abertura do leque saem da largura do carrossel, não da tela (container queries): ele
 * funciona numa seção menor que a página. Numa tela baixa, o leque se achata para caber em 70% da altura.
 *
 * As animações são do GSAP (3.15.0, carregado antes deste arquivo). O carrossel não tem fundo: os cartões ficam sobre
 * o fundo da página, e o tema (escuro ou claro) só muda as bordas, as sombras, as setas e os pontos.
 *
 * Porte em JavaScript puro do componente React original.
 *
 * Uso:
 *   CardFanCarousel(elemento, {
 *     cards: [{ imgUrl: "foto.jpg", alt: "Descrição", linkUrl: "/destino" }],
 *     // ou, com texto sobre a foto e um clique em vez de link:
 *     // { imgUrl, alt, eyebrow: "Itália", title: "Roma", cta: "Ver roteiro", onClick: function (card, el) {} }
 *     theme: "dark" // ou "light"
 *   })
 */
(function (global) {
  'use strict';

  // com mais de sete cartões, o leque mostra sete e as setas giram
  var MAX_VISIBLE = 7;
  var HALF = 3;

  // o leque de sete: a inclinação (graus), a escala, o deslocamento (rem) e a ordem de cada lugar, da esquerda para a direita
  var FAN_POSITIONS = [
    { rot: -21, scale: 0.7756, x: -30, y: 7.3, zIndex: 1 },
    { rot: -14, scale: 0.8498, x: -22, y: 4.0, zIndex: 2 },
    { rot: -7, scale: 0.9346, x: -11, y: 1.3, zIndex: 3 },
    { rot: 0, scale: 1.0, x: 0, y: 0.0, zIndex: 10 },
    { rot: 7, scale: 0.9346, x: 11, y: 1.3, zIndex: 3 },
    { rot: 14, scale: 0.8498, x: 22, y: 4.0, zIndex: 2 },
    { rot: 21, scale: 0.7756, x: 30, y: 7.3, zIndex: 1 }
  ];

  // as faixas de largura do carrossel, as mesmas das container queries do CSS: a abertura do leque e a altura ideal dele
  function getResponsiveMultiplier(width) {
    if (width < 480) return 0.28;
    if (width < 640) return 0.38;
    if (width < 768) return 0.5;
    if (width < 1024) return 0.75;
    return 1.0;
  }

  function getIdealHeight(width) {
    if (width < 480) return 22 * 16;
    if (width < 640) return 26 * 16;
    if (width < 768) return 28 * 16;
    if (width < 1024) return 34 * 16;
    return 38 * 16;
  }

  /**
   * Quanto o leque se achata (0..1]: o CSS limita a altura dele a 70% da tela, e as alturas do leque e da entrada
   * encolhem na mesma proporção.
   */
  function getHeightMultiplier(width, height) {
    var ideal = getIdealHeight(width);
    return height >= ideal ? 1 : height / ideal;
  }

  // com menos de sete cartões, o leque se abre na mesma curva, só com os lugares que eles ocupam. O centro é o meio
  // exato da fileira, para que um número par de cartões (sem um do meio) também fique simétrico
  function getSlotConfig(totalCards, slot) {
    if (totalCards >= MAX_VISIBLE) return FAN_POSITIONS[slot];
    var center = (totalCards - 1) / 2;
    var distance = totalCards > 1 ? (slot - center) / center : 0;
    var absDistance = Math.abs(distance);
    return {
      rot: distance * 21,
      scale: 1.0 - 0.2244 * absDistance * absDistance,
      x: distance * 30,
      y: absDistance * absDistance * 7.3,
      zIndex: 10 - Math.round(Math.abs(slot - center))
    };
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function chevron(direction) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'cf-chevron');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var polyline = document.createElementNS(SVG_NS, 'polyline');
    polyline.setAttribute('points', direction === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6');
    svg.appendChild(polyline);
    return svg;
  }

  // o CSS vai uma vez só para a página, mesmo com vários carrosséis
  function injectStyles() {
    if (document.getElementById('cf-styles')) return;
    var style = document.createElement('style');
    style.id = 'cf-styles';
    style.textContent = CF_CSS;
    document.head.appendChild(style);
  }

  function CardFanCarousel(root, options) {
    var gsap = global.gsap;
    if (!root || !gsap) return null;

    var cards = (options && options.cards) || [];
    var theme = (options && options.theme) || 'dark';
    var totalCards = cards.length;
    if (!totalCards) return null;

    injectStyles();

    var needsPagination = totalCards > MAX_VISIBLE;
    var centerIndex = needsPagination ? HALF : totalCards >> 1;
    var isAnimating = false;
    var hasEntered = false;
    var direction = null;
    var prevVisible = new Set();
    var cleanupLayout = null;

    // ---- a marcação ----
    root.classList.add('cf-root');
    root.setAttribute('data-theme', theme);
    root.innerHTML = '';

    var section = document.createElement('div');
    section.className = 'cf-section';
    var frame = document.createElement('div');
    frame.className = 'cf-frame';
    var container = document.createElement('div');
    container.className = 'cf-fan';

    var cardElements = cards.map(function (card, index) {
      var el;
      if (card.onClick) {
        // com onClick, o cartão vira um botão (abre um painel, um modal…)
        el = document.createElement('button');
        el.type = 'button';
        el.className = 'cf-card cf-card--link';
        el.addEventListener('click', function () { card.onClick(card, el); });
      } else if (card.linkUrl) {
        el = document.createElement('a');
        el.href = card.linkUrl;
        el.target = card.linkUrl.indexOf('http') === 0 ? '_blank' : '_self';
        el.rel = 'noopener noreferrer';
        el.className = 'cf-card cf-card--link';
      } else {
        el = document.createElement('div');
        el.className = 'cf-card';
      }
      var media = document.createElement('div');
      media.className = 'cf-media';
      var img = document.createElement('img');
      img.src = card.imgUrl;
      img.loading = 'lazy';
      img.alt = card.alt || 'Cartão ' + (index + 1);
      img.className = 'cf-img';
      media.appendChild(img);
      el.appendChild(media);

      // um texto opcional sobre a foto: o rótulo pequeno (eyebrow), o título e a chamada (cta)
      if (card.title) {
        var veil = document.createElement('div');
        veil.className = 'cf-veil';
        el.appendChild(veil);

        var caption = document.createElement('div');
        caption.className = 'cf-caption';
        if (card.eyebrow) {
          var eyebrow = document.createElement('span');
          eyebrow.className = 'cf-eyebrow';
          eyebrow.textContent = card.eyebrow;
          caption.appendChild(eyebrow);
        }
        var title = document.createElement('h3');
        title.className = 'cf-title';
        title.textContent = card.title;
        caption.appendChild(title);
        if (card.cta) {
          var cta = document.createElement('span');
          cta.className = 'cf-cta';
          cta.textContent = card.cta;
          caption.appendChild(cta);
        }
        el.appendChild(caption);
      }
      container.appendChild(el);
      return el;
    });

    frame.appendChild(container);
    section.appendChild(frame);

    var dots = [];
    if (needsPagination) {
      var controls = document.createElement('div');
      controls.className = 'cf-controls';

      var prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'cf-arrow';
      prev.setAttribute('aria-label', 'Anterior');
      prev.appendChild(chevron('left'));
      prev.addEventListener('click', function () { cycle('left'); });

      var dotsWrap = document.createElement('div');
      dotsWrap.className = 'cf-dots';
      cards.forEach(function () {
        var dot = document.createElement('span');
        dot.className = 'cf-dot';
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });

      var next = document.createElement('button');
      next.type = 'button';
      next.className = 'cf-arrow';
      next.setAttribute('aria-label', 'Próximo');
      next.appendChild(chevron('right'));
      next.addEventListener('click', function () { cycle('right'); });

      controls.appendChild(prev);
      controls.appendChild(dotsWrap);
      controls.appendChild(next);
      section.appendChild(controls);
    }

    root.appendChild(section);

    function updateDots() {
      dots.forEach(function (dot, i) {
        dot.classList.toggle('cf-dot--active', i === centerIndex);
      });
    }
    updateDots();

    function getVisibleMap(center) {
      var map = new Map();
      if (!needsPagination) {
        for (var i = 0; i < totalCards; i++) map.set(i, i);
        return map;
      }
      for (var slot = 0; slot < MAX_VISIBLE; slot++) {
        map.set((((center + slot - HALF) % totalCards) + totalCards) % totalCards, slot);
      }
      return map;
    }

    function cycle(dir) {
      if (isAnimating || !needsPagination) return;
      isAnimating = true;
      direction = dir;
      centerIndex = dir === 'right' ? (centerIndex + 1) % totalCards : (centerIndex - 1 + totalCards) % totalCards;
      updateDots();
      layout();
    }

    // ---- o leque: abre os cartões nos lugares, liga o hover e acompanha a largura ----
    function layout() {
      if (cleanupLayout) { cleanupLayout(); cleanupLayout = null; }

      var visibleMap = getVisibleMap(centerIndex);
      var previouslyVisible = prevVisible;
      var isFirstMount = !hasEntered;
      var multiplier = getResponsiveMultiplier(root.clientWidth);
      var hMult = getHeightMultiplier(root.clientWidth, container.clientHeight);
      var slotCount = needsPagination ? MAX_VISIBLE : totalCards;
      var config = function (slot) { return getSlotConfig(slotCount, slot); };

      if (isFirstMount) isAnimating = true;

      var completedCount = 0;
      var visibleCount = visibleMap.size;
      var onCardDone = function () {
        if (++completedCount >= visibleCount) {
          isAnimating = false;
          if (isFirstMount) hasEntered = true;
        }
      };

      cardElements.forEach(function (card, cardIndex) {
        var slot = visibleMap.get(cardIndex);
        var wasVisible = previouslyVisible.has(cardIndex);

        if (slot !== undefined) {
          var c = config(slot);
          // nos cartões à direita do centro, o texto vai para a direita, longe do vizinho que os cobre
          card.classList.toggle('cf-card--end', slot > (slotCount - 1) / 2);
          var target = {
            x: c.x * multiplier + 'rem',
            y: c.y * hMult + 'rem',
            rotation: c.rot,
            scale: c.scale,
            opacity: 1,
            zIndex: c.zIndex
          };

          if (isFirstMount) {
            gsap.set(card, { x: 0, y: 12 * hMult + 'rem', rotation: 0, scale: 0.5, opacity: 0 });
            gsap.to(card, Object.assign({}, target, { duration: 1.2, ease: 'elastic.out(1.05,.78)', delay: 0.2 + slot * 0.06, onComplete: onCardDone }));
          } else if (!wasVisible) {
            var enterX = direction === 'right' ? 40 : -40;
            gsap.set(card, { x: enterX + 'rem', y: c.y * hMult + 'rem', rotation: direction === 'right' ? 30 : -30, scale: 0.5, opacity: 0 });
            gsap.to(card, Object.assign({}, target, { duration: 0.6, ease: 'power2.out', onComplete: onCardDone }));
          } else {
            gsap.to(card, Object.assign({}, target, { duration: 0.5, ease: 'power2.out', onComplete: onCardDone }));
          }
        } else if (wasVisible) {
          var exitX = direction === 'right' ? -40 : 40;
          gsap.to(card, { x: exitX + 'rem', opacity: 0, scale: 0.5, rotation: direction === 'right' ? -30 : 30, duration: 0.4, ease: 'power2.in', zIndex: 0 });
        } else if (isFirstMount) {
          gsap.set(card, { opacity: 0, scale: 0.3, x: 0, y: 0, zIndex: 0 });
        }
      });

      prevVisible = new Set(visibleMap.keys());

      // o hover: o cartão sob o mouse sobe e cresce, e os vizinhos se afastam e inclinam um pouco mais
      var visibleEntries = [];
      cardElements.forEach(function (el, i) {
        var slot = visibleMap.get(i);
        if (slot !== undefined) visibleEntries.push({ el: el, slot: slot });
      });
      visibleEntries.sort(function (a, b) { return a.slot - b.slot; });

      var activeSlot = null;
      var leaveTimer = null;
      var centerSlot = (visibleEntries.length - 1) / 2;

      function updateHoverLayout(hoveredSlot) {
        var mult = getResponsiveMultiplier(root.clientWidth);
        var hM = getHeightMultiplier(root.clientWidth, container.clientHeight);

        visibleEntries.forEach(function (entry) {
          var el = entry.el;
          var slot = entry.slot;
          var base = config(slot);
          var targetX = base.x * mult;
          var targetY = base.y * hM;
          var targetRot = base.rot;
          var targetScale = base.scale;
          var delay = 0;

          if (hoveredSlot !== null) {
            var distance = Math.abs(slot - hoveredSlot);
            delay = distance * 0.02;

            if (slot === hoveredSlot) {
              targetY -= 2.5 * hM;
              targetScale *= 1.08;
            } else {
              var normalized = centerSlot > 0 ? (slot - centerSlot) / centerSlot : 0;
              var pushStrength = 8 * (1 - Math.abs(normalized)) * (1 + 0.2 * Math.max(0, 3 - distance));

              if (slot < hoveredSlot) {
                targetX -= pushStrength * mult;
                targetRot -= 3 / (distance + 1);
              } else {
                targetX += pushStrength * mult;
                targetRot += 3 / (distance + 1);
              }

              if (slot === visibleEntries.length - 1 && hoveredSlot < centerSlot) targetY -= 1 * hM;
              if (slot === 0 && hoveredSlot > centerSlot) targetY -= 1 * hM;
            }
          } else {
            delay = Math.abs(slot - centerSlot) * 0.02;
          }

          gsap.to(el, {
            x: targetX + 'rem', y: targetY + 'rem', rotation: targetRot, scale: targetScale,
            duration: 0.5, delay: delay, ease: 'elastic.out(1,.75)', overwrite: 'auto'
          });
          gsap.set(el, { zIndex: base.zIndex });
        });
      }

      var enterHandlers = visibleEntries.map(function (entry) {
        var handler = function () {
          if (isAnimating) return;
          if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
          if (activeSlot !== entry.slot) { activeSlot = entry.slot; updateHoverLayout(entry.slot); }
        };
        entry.el.addEventListener('mouseenter', handler);
        return { el: entry.el, handler: handler };
      });

      var onMouseLeave = function () {
        if (isAnimating) return;
        if (leaveTimer) clearTimeout(leaveTimer);
        leaveTimer = setTimeout(function () { activeSlot = null; updateHoverLayout(null); }, 50);
      };
      container.addEventListener('mouseleave', onMouseLeave);

      // a largura do carrossel mudou: o leque se abre de novo na faixa nova (a primeira medida é a de agora, e não conta)
      var measured = false;
      var ro = new ResizeObserver(function () {
        if (!measured) { measured = true; return; }
        if (!isAnimating) updateHoverLayout(activeSlot);
      });
      ro.observe(root);

      cleanupLayout = function () {
        enterHandlers.forEach(function (h) { h.el.removeEventListener('mouseenter', h.handler); });
        container.removeEventListener('mouseleave', onMouseLeave);
        ro.disconnect();
        if (leaveTimer) clearTimeout(leaveTimer);
      };
    }

    // a entrada espera o carrossel aparecer na tela
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        layout();
      }
    }, { threshold: 0.2 });
    io.observe(root);

    return {
      next: function () { cycle('right'); },
      prev: function () { cycle('left'); },
      destroy: function () {
        io.disconnect();
        if (cleanupLayout) cleanupLayout();
        gsap.killTweensOf(cardElements);
        root.innerHTML = '';
      }
    };
  }

  var CF_CSS = `
/* o que o projeto pode trocar com uma classe (largura, margem): na camada base, que perde para o CSS fora de camada */
@layer base {
  .cf-root { position: relative; width: 100%; margin: 0; }
}
.cf-root {
  container-type: inline-size;
  box-sizing: border-box;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
  --cf-card-border: rgba(255, 255, 255, .08);
  --cf-card-shadow: 0 15px 35px rgba(0, 0, 0, .5);
  --cf-arrow-border: rgba(255, 255, 255, .1);
  --cf-arrow-border-hover: rgba(255, 255, 255, .25);
  --cf-arrow-bg: rgba(255, 255, 255, .05);
  --cf-arrow-color: rgba(255, 255, 255, .55);
  --cf-arrow-color-hover: rgba(255, 255, 255, .8);
  --cf-arrow-ring: rgba(255, 255, 255, .04);
  --cf-arrow-shadow: 0 4px 20px rgba(0, 0, 0, .4);
  --cf-dot: rgba(255, 255, 255, .15);
  --cf-dot-active: rgba(255, 255, 255, .8);
}
.cf-root[data-theme="light"] {
  --cf-card-border: rgba(0, 0, 0, .08);
  --cf-card-shadow: 0 15px 35px rgba(0, 0, 0, .15);
  --cf-arrow-border: rgba(0, 0, 0, .1);
  --cf-arrow-border-hover: rgba(0, 0, 0, .25);
  --cf-arrow-bg: rgba(0, 0, 0, .05);
  --cf-arrow-color: rgba(0, 0, 0, .4);
  --cf-arrow-color-hover: rgba(0, 0, 0, .7);
  --cf-arrow-ring: rgba(0, 0, 0, .04);
  --cf-arrow-shadow: 0 4px 20px rgba(0, 0, 0, .1);
  --cf-dot: rgba(0, 0, 0, .15);
  --cf-dot-active: rgba(0, 0, 0, .7);
}
.cf-root *, .cf-root *::before, .cf-root *::after { box-sizing: border-box; }

.cf-section {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 1rem;
}
.cf-frame { display: flex; align-items: center; justify-content: center; width: 100%; max-width: 90rem; }

/* o leque: os cartões ficam todos no centro e o GSAP abre cada um no lugar dele. A altura é a ideal da faixa de
   largura, até 70% da tela (--cf-vh é 1% da altura de referência, a da tela por padrão) */
.cf-fan {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 80rem;
  height: min(38rem, calc(70 * var(--cf-vh, 1vh)));
}
.cf-card {
  position: absolute;
  display: block;
  width: min(20rem, calc(36.84 * var(--cf-vh, 1vh)));
  height: min(35rem, calc(64.47 * var(--cf-vh, 1vh)));
  margin: 0;
  padding: 0;
  overflow: clip;
  border: 1px solid var(--cf-card-border);
  border-radius: min(3.316rem, calc(6.11 * var(--cf-vh, 1vh)));
  background: transparent;
  box-shadow: var(--cf-card-shadow);
  opacity: 0;
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.cf-card--link { cursor: pointer; }
button.cf-card { font: inherit; color: inherit; text-align: left; appearance: none; -webkit-appearance: none; }
.cf-card:focus-visible { outline: 2px solid var(--cf-accent, currentColor); outline-offset: 4px; }

/* o texto opcional sobre a foto (title, eyebrow e cta): a fonte do título e a cor de destaque vêm de --cf-title-font
   e --cf-accent, que o projeto pode definir no pai */
.cf-veil {
  position: absolute;
  inset: 0;
  z-index: 11;
  background: linear-gradient(0deg, rgba(0, 0, 0, .78) 0%, rgba(0, 0, 0, .12) 55%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
}
.cf-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 12;
  padding: 1.6rem 1.5rem;
  color: #fff;
  pointer-events: none;
}
.cf-card--end .cf-caption { text-align: right; }
.cf-eyebrow { display: block; margin-bottom: .2rem; color: var(--cf-accent, #fff); font-size: .8rem; font-weight: 600; }
.cf-title { margin: 0; font-family: var(--cf-title-font, inherit); font-size: 1.6rem; font-weight: 480; line-height: 1.15; }
.cf-cta {
  display: inline-block;
  margin-top: .7rem;
  padding-bottom: 2px;
  border-bottom: 1px solid var(--cf-accent, #fff);
  color: rgba(255, 255, 255, .75);
  font-size: .82rem;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity .3s ease, transform .3s ease;
}
.cf-card:hover .cf-cta, .cf-card:focus-visible .cf-cta { opacity: 1; transform: none; }
/* uma faixa invisível embaixo de cada cartão: com o cartão erguido no hover, o mouse logo abaixo dele continua nele */
.cf-card::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -4rem;
  z-index: 100;
  height: 4rem;
  pointer-events: auto;
}
.cf-media { position: relative; width: 100%; height: 100%; overflow: hidden; }
.cf-img {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  margin: 0;
  object-fit: cover;
}

.cf-controls { position: relative; z-index: 30; display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1rem; }
.cf-dots { display: flex; align-items: center; gap: .5rem; }
.cf-dot { display: block; width: .5rem; height: .5rem; border-radius: 9999px; background: var(--cf-dot); transition: all .3s cubic-bezier(.4, 0, .2, 1); }
.cf-dot--active { background: var(--cf-dot-active); transform: scale(1.3); }

.cf-arrow {
  position: relative;
  z-index: 30;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  margin: 0;
  padding: 0;
  border: 1.5px solid var(--cf-arrow-border);
  border-radius: 9999px;
  background: var(--cf-arrow-bg);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  color: var(--cf-arrow-color);
  box-shadow: var(--cf-arrow-shadow);
  font: inherit;
  cursor: pointer;
  outline: none;
  transition: color .3s cubic-bezier(.4, 0, .2, 1), border-color .3s cubic-bezier(.4, 0, .2, 1);
}
.cf-arrow::before {
  content: "";
  position: absolute;
  inset: 3px;
  border: 1px solid var(--cf-arrow-ring);
  border-radius: 9999px;
  pointer-events: none;
}
.cf-arrow:hover { border-color: var(--cf-arrow-border-hover); color: var(--cf-arrow-color-hover); }
.cf-arrow:focus-visible { border-color: var(--cf-arrow-border-hover); color: var(--cf-arrow-color-hover); }
.cf-arrow:active { opacity: .7; }
.cf-chevron { position: relative; z-index: 2; display: block; width: 1rem; height: 1rem; }

/* as faixas de largura do carrossel, as mesmas do getResponsiveMultiplier */
@container (min-width: 768px) {
  .cf-section { padding-inline: 2rem; }
  .cf-controls { margin-top: 1.5rem; }
  .cf-arrow { width: 3rem; height: 3rem; }
  .cf-chevron { width: 1.25rem; height: 1.25rem; }
}
@container (min-width: 1024px) {
  .cf-section { padding-block: 2rem; }
}
@container (max-width: 1023.98px) {
  .cf-fan { height: min(34rem, calc(70 * var(--cf-vh, 1vh))); }
  .cf-card {
    width: min(16rem, calc(32.94 * var(--cf-vh, 1vh)));
    height: min(28rem, calc(57.65 * var(--cf-vh, 1vh)));
    border-radius: min(2.6rem, calc(5.35 * var(--cf-vh, 1vh)));
  }
}
@container (max-width: 767.98px) {
  .cf-fan { height: min(28rem, calc(70 * var(--cf-vh, 1vh))); }
  .cf-card {
    width: min(12rem, calc(30 * var(--cf-vh, 1vh)));
    height: min(21rem, calc(52.5 * var(--cf-vh, 1vh)));
    border-radius: min(2rem, calc(5 * var(--cf-vh, 1vh)));
  }
}
@container (max-width: 767.98px) {
  .cf-caption { padding: 1.1rem 1rem; }
  .cf-title { font-size: 1.2rem; }
  .cf-cta { display: none; }
}
@container (max-width: 639.98px) {
  .cf-caption { padding: .8rem .75rem; }
  .cf-eyebrow { font-size: .68rem; }
  .cf-title { font-size: .95rem; }
}
@container (max-width: 479.98px) {
  .cf-caption { padding: .7rem .6rem; }
  .cf-eyebrow { font-size: .62rem; }
  .cf-title { font-size: .8rem; }
}
@container (max-width: 639.98px) {
  .cf-fan { height: min(26rem, calc(70 * var(--cf-vh, 1vh))); }
  .cf-card {
    width: min(9rem, calc(24.23 * var(--cf-vh, 1vh)));
    height: min(15.75rem, calc(42.4 * var(--cf-vh, 1vh)));
    border-radius: min(1.5rem, calc(4.04 * var(--cf-vh, 1vh)));
  }
}
@container (max-width: 479.98px) {
  .cf-fan { height: min(22rem, calc(70 * var(--cf-vh, 1vh))); }
  .cf-card {
    width: min(7rem, calc(22.27 * var(--cf-vh, 1vh)));
    height: min(12.25rem, calc(38.98 * var(--cf-vh, 1vh)));
    border-radius: min(1.2rem, calc(3.82 * var(--cf-vh, 1vh)));
  }
}
`;

  global.CardFanCarousel = CardFanCarousel;
})(window);
