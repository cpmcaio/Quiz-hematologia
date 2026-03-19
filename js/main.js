/**
 * main.js – Lógica do Quiz de Doação de Sangue
 * Responsabilidades:
 *   1. Dados das perguntas (array de objetos)
 *   2. Renderização dos cards no DOM
 *   3. Mecânica de drag com Pointer Events
 *   4. Lógica de swipe (threshold, rotação, fly-out)
 *   5. Contabilização de respostas
 *   6. Exibição da tela de resultados
 */

'use strict';

/* ============================================================
   1. DADOS – Array de perguntas
   ============================================================ */
const questions = [
    {
        id: 1,
        text: 'Quem tem tatuagem nunca mais pode doar sangue.',
        isTrue: false,
    },
    {
        id: 2,
        text: 'Pessoas com mais de 60 anos não podem ser doadoras de sangue.',
        isTrue: false,
    },
    {
        id: 3,
        text: 'É possível contrair doenças ao doar sangue.',
        isTrue: false,
    },
    {
        id: 4,
        text: 'Doadores de sangue devem pesar no mínimo 50 kg.',
        isTrue: true,
    },
    {
        id: 5,
        text: 'Homens podem doar sangue a cada 2 meses.',
        isTrue: false,
    },
    {
        id: 6,
        text: 'Mulheres podem fazer até 3 doações de sangue por ano.',
        isTrue: true,
    },
    {
        id: 7,
        text: 'Diabéticos que usam insulina não podem doar sangue.',
        isTrue: true,
    },
    {
        id: 8,
        text: 'Um único doador pode salvar até quatro vidas.',
        isTrue: true,
    },
    {
        id: 9,
        text: 'Pessoas com pressão alta controlada não podem ser doadoras.',
        isTrue: false,
    },
    {
        id: 10,
        text: 'O estoque de sangue dura apenas 5 dias após a coleta.',
        isTrue: false,
    },
];

/* ============================================================
   2. ESTADO – Variáveis de controle do fluxo
   ============================================================ */
let currentIndex = 0;      // Índice do card ativo
const userAnswers = [];    // { question, answered: true/false } por rodada

/* ============================================================
   3. REFERÊNCIAS DOM
   ============================================================ */
const cardStack = document.getElementById('card-stack');
const cardCounter = document.getElementById('card-counter');
const btnTrue = document.getElementById('btn-true');
const btnFalse = document.getElementById('btn-false');
const quizSection = document.getElementById('quiz-section');
const resultSection = document.getElementById('result-section');
const scoreText = document.getElementById('score-text');
const scoreSubtext = document.getElementById('score-subtext');
const gabaritoList = document.getElementById('gabarito-list');
const btnRestart = document.getElementById('btn-restart');

/* ============================================================
   4. CONSTANTE DE SWIPE
   ============================================================ */
/** Distância mínima (px) para confirmar o swipe */
const SWIPE_THRESHOLD = 100;

/** Rotação máxima em graus durante o drag */
const MAX_ROTATION = 18;

/* ============================================================
   5. RENDERIZAÇÃO DOS CARDS
   ============================================================ */

/**
 * Cria o elemento DOM de um card para a questão fornecida.
 * @param {Object} question – Objeto de pergunta
 * @param {boolean} isNext  – Se true, aplica estilo de "próximo card"
 * @returns {HTMLElement}
 */
function createCardElement(question, isNext = false) {
    const card = document.createElement('article');
    card.classList.add('quiz-card');
    if (isNext) card.classList.add('next-card');
    card.dataset.id = question.id;

    card.innerHTML = `
    <img
      src="./assets/zé-bloodinho.png"
      alt="Mascote Zé Bloodinho"
      class="mascot-img"
      draggable="false"
    />
    <!-- Espaçador: reserva no fluxo flex a altura que o mascote ocupa dentro do card -->
    <div class="mascot-spacer" aria-hidden="true"></div>
    <span class="swipe-label label-true" aria-hidden="true">VERDADE</span>
    <span class="swipe-label label-false" aria-hidden="true">MITO</span>
    <p class="card-question">${question.text}</p>
  `;

    return card;
}

/**
 * Renderiza o card atual e (se houver) o próximo card no stack.
 */
function renderCards() {
    cardStack.innerHTML = '';

    // Próximo card (embaixo, visível como "peek")
    if (currentIndex + 1 < questions.length) {
        const nextCard = createCardElement(questions[currentIndex + 1], true);
        cardStack.appendChild(nextCard);
    }

    // Card atual
    if (currentIndex < questions.length) {
        const activeCard = createCardElement(questions[currentIndex], false);
        cardStack.appendChild(activeCard);
        attachDragEvents(activeCard);
    }

    updateCounter();
}

/*Update counter*/
function updateCounter() {
    const remaining = questions.length - currentIndex;
    cardCounter.textContent = `${currentIndex + 1} / ${questions.length}`;
}

/* ============================================================
   6. MECÂNICA DE DRAG (Pointer Events)
   ============================================================ */

/**
 * Anexa os Pointer Events de drag ao card ativo.
 * @param {HTMLElement} card
 */
function attachDragEvents(card) {
    let startX = 0;  // Posição X do ponteiro ao iniciar o drag
    let currentX = 0; // Posição X atual durante o drag
    let isDragging = false;

    // ---- Início do drag ----
    card.addEventListener('pointerdown', (e) => {
        startX = e.clientX;
        isDragging = true;
        card.setPointerCapture(e.pointerId); // Mantém o ponteiro "preso" ao card
    });

    // ---- Durante o drag ----
    card.addEventListener('pointermove', (e) => {
        if (!isDragging) return;

        currentX = e.clientX;

        /**
         * deltaX: quanto o card se deslocou horizontalmente.
         * Positivo → arrasto para direita (Verdadeiro)
         * Negativo → arrasto para esquerda (Falso)
         */
        const deltaX = currentX - startX;

        /**
         * Rotação proporcional ao deslocamento.
         * Usamos Math.min/max para limitar ao MAX_ROTATION.
         * O fator 0.12 suaviza a rotação em relação ao pixel de drag.
         */
        const rotation = Math.min(Math.max(deltaX * 0.12, -MAX_ROTATION), MAX_ROTATION);

        // Aplica transformação visual em tempo real (sem transition)
        card.style.transition = 'none';
        card.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

        // Mostra o label de hint (VERDADE ou MITO) proporcional ao drag
        updateSwipeLabels(card, deltaX);
    });

    // ---- Fim do drag (soltar) ----
    card.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;

        const deltaX = currentX - startX;
        evaluateSwipe(card, deltaX);
    });

    // Cancela drag se o ponteiro sair da janela
    card.addEventListener('pointercancel', () => {
        if (!isDragging) return;
        isDragging = false;
        snapBack(card);
    });
}

/**
 * Controla a opacidade dos labels "VERDADE" e "MITO" durante o drag.
 * @param {HTMLElement} card
 * @param {number} deltaX – deslocamento horizontal atual
 */
function updateSwipeLabels(card, deltaX) {
    const labelTrue = card.querySelector('.label-true');
    const labelFalse = card.querySelector('.label-false');

    /**
     * Opacidade cresce proporcionalmente ao drag a partir de 20px.
     * Limita-se a 1 (100%) quando deltaX ≥ SWIPE_THRESHOLD.
     */
    const factor = Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1);

    if (deltaX > 0) {
        labelTrue.style.opacity = factor;
        labelFalse.style.opacity = 0;
    } else {
        labelFalse.style.opacity = factor;
        labelTrue.style.opacity = 0;
    }
}

/* ============================================================
   7. LÓGICA DE AVALIAÇÃO DO SWIPE
   ============================================================ */

/**
 * Decide se o swipe foi suficiente para confirmar a resposta
 * ou se o card deve voltar ao centro.
 * @param {HTMLElement} card
 * @param {number} deltaX – deslocamento horizontal total do drag
 */
function evaluateSwipe(card, deltaX) {
    const absX = Math.abs(deltaX);

    if (absX >= SWIPE_THRESHOLD) {
        // Swipe confirmado → processa como Verdadeiro (direita) ou Falso (esquerda)
        const answeredTrue = deltaX > 0;
        flyOut(card, answeredTrue);
        recordAnswer(answeredTrue);
    } else {
        // Swipe insuficiente → volta suavemente ao centro
        snapBack(card);
    }
}

/**
 * Registra a resposta do usuário para a questão atual.
 * @param {boolean} answeredTrue – true se o usuário respondeu "Verdadeiro"
 */
function recordAnswer(answeredTrue) {
    const question = questions[currentIndex];
    userAnswers.push({
        question,
        answeredTrue,
        isCorrect: answeredTrue === question.isTrue,
    });

    currentIndex++;

    // Aguarda a animação de fly-out antes de renderizar o próximo card
    setTimeout(() => {
        if (currentIndex < questions.length) {
            renderCards();
        } else {
            showResults();
        }
    }, 420);
}

/* ============================================================
   8. ANIMAÇÕES DE CARD
   ============================================================ */

/**
 * Anima o card voando para fora da tela no lado correto.
 * @param {HTMLElement} card
 * @param {boolean} toRight – true = voa para a direita
 */
function flyOut(card, toRight) {
    card.classList.add('is-animating');

    const direction = toRight ? 1 : -1;
    const flyDistance = window.innerWidth + 200; // Garante sair completamente da tela

    card.style.transform = `translateX(${direction * flyDistance}px) rotate(${direction * MAX_ROTATION}deg)`;
    card.style.opacity = '0';
}

/**
 * Retorna o card suavemente à posição original (sem resposta registrada).
 * @param {HTMLElement} card
 */
function snapBack(card) {
    card.classList.add('is-animating');
    card.style.transform = 'translateX(0) rotate(0deg)';

    // Reseta os labels de hint
    const labels = card.querySelectorAll('.swipe-label');
    labels.forEach((l) => (l.style.opacity = 0));

    // Remove a classe de animação após a transição terminar
    card.addEventListener('transitionend', () => {
        card.classList.remove('is-animating');
    }, { once: true });
}

/* ============================================================
   9. BOTÕES DE AÇÃO (disparam animação programática)
   ============================================================ */

/**
 * Força um swipe programático a partir dos botões Verdadeiro/Falso.
 * @param {boolean} asTrue – true = simula swipe para a direita
 */
function triggerButtonSwipe(asTrue) {
    const activeCard = cardStack.querySelector('.quiz-card:not(.next-card)');
    if (!activeCard) return;

    // Desabilita botões durante animação para evitar duplo-clique
    btnTrue.disabled = true;
    btnFalse.disabled = true;

    setTimeout(() => {
        btnTrue.disabled = false;
        btnFalse.disabled = false;
    }, 500);

    flyOut(activeCard, asTrue);
    recordAnswer(asTrue);
}

btnTrue.addEventListener('click', () => triggerButtonSwipe(true));
btnFalse.addEventListener('click', () => triggerButtonSwipe(false));

/* ============================================================
   10. TELA DE RESULTADOS
   ============================================================ */

/**
 * Exibe a section de resultados com pontuação e gabarito.
 */
function showResults() {
    // Oculta quiz, mostra resultados
    quizSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    resultSection.classList.add('flex');

    const totalCorrect = userAnswers.filter((a) => a.isCorrect).length;
    const total = userAnswers.length;

    // Pontuação
    scoreText.textContent = `${totalCorrect} / ${total}`;
    scoreSubtext.textContent = buildScoreMessage(totalCorrect, total);

    // Gabarito
    gabaritoList.innerHTML = '';
    userAnswers.forEach((answer, index) => {
        const item = document.createElement('li');
        item.classList.add('gabarito-item');

        const icon = answer.isCorrect ? '✅' : '❌';
        const correct = answer.question.isTrue ? 'Verdadeiro' : 'Falso';
        const userReply = answer.answeredTrue ? 'Verdadeiro' : 'Falso';

        item.innerHTML = `
      <span class="icon" aria-hidden="true">${icon}</span>
      <div>
        <strong>${index + 1}. ${answer.question.text}</strong><br/>
        <span class="opacity-80">
          Resposta correta: <em>${correct}</em> · Você respondeu: <em>${userReply}</em>
        </span>
      </div>
    `;

        gabaritoList.appendChild(item);
    });
}

/**
 * Gera uma mensagem motivacional baseada na pontuação.
 * @param {number} correct
 * @param {number} total
 * @returns {string}
 */
function buildScoreMessage(correct, total) {
    const pct = correct / total;
    if (pct === 1) return '🏆 Perfeito! Você é um especialista em doação!';
    if (pct >= 0.7) return '👏 Muito bem! Você está bem informado.';
    if (pct >= 0.4) return '📚 Bom esforço! Que tal aprender mais sobre doação?';
    return '💉 Não desanime! Doe sangue e salve vidas.';
}

/* ============================================================
   11. REINICIAR O QUIZ
   ============================================================ */

/**
 * Reseta o estado global e re-renderiza o quiz do início.
 */
function restartQuiz() {
    currentIndex = 0;
    userAnswers.length = 0;

    resultSection.classList.add('hidden');
    resultSection.classList.remove('flex');
    quizSection.classList.remove('hidden');

    renderCards();
}

btnRestart.addEventListener('click', restartQuiz);

/* ============================================================
   12. INICIALIZAÇÃO
   ============================================================ */
renderCards();
