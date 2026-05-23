let pairs = [];
let connections = [];
let selectedWordEl = null;
let isLocked = false; // NEW: Tracks if the board is locked for checking

function generateInputs(data = null) {
  const count = document.getElementById('rowCount').value;
  const container = document.getElementById('input-list');

  container.innerHTML = '<div><strong>Word</strong></div><div><strong>Definition</strong></div>';

  for (let i = 0; i < count; i++) {
    const wVal = (data && data[i]) ? data[i].word : '';
    const dVal = (data && data[i]) ? data[i].def : '';

    container.innerHTML += `
        <input type="text" class="w-in" value="${wVal}" placeholder="Word ${i + 1}">
        <textarea class="d-in" placeholder="Definition ${i + 1}" rows="1">${dVal}</textarea>
    `;
  }
}

function startGame() {
  const wInputs = document.querySelectorAll('.w-in');
  const dInputs = document.querySelectorAll('.d-in');

  pairs = [];
  connections = [];
  selectedWordEl = null;
  isLocked = false; // Reset lock state

  // Reset the main action button back to its default state
  const checkBtn = document.querySelector('#controls button:first-child');
  if (checkBtn) {
    checkBtn.innerText = "Check Results";
    checkBtn.onclick = checkAnswers;
    checkBtn.style.background = '';
  }

  wInputs.forEach((input, i) => {
    if (input.value.trim()) {
      pairs.push({ id: i, word: input.value.trim(), def: dInputs[i].value.trim() });
    }
  });

  if (pairs.length < 1) return alert("Please enter at least one word.");

  document.getElementById('setup').style.display = 'none';
  document.getElementById('game-area').style.display = 'grid';
  document.getElementById('controls').style.display = 'flex';

  renderBoard();
}

function renderBoard() {
  const area = document.getElementById('game-area');
  area.innerHTML = '<canvas id="lineCanvas"></canvas>';

  const shuffledWords = [...pairs].sort(() => Math.random() - 0.5);
  const shuffledDefs = [...pairs].sort(() => Math.random() - 0.5);

  for (let i = 0; i < pairs.length; i++) {
    const w = shuffledWords[i];
    const d = shuffledDefs[i];

    area.innerHTML += `<div class="item" data-id="${w.id}" onclick="selectWord(this)">${w.word}<div class="dot word-dot"></div></div>`;
    area.innerHTML += `<div class="item" data-id="${d.id}" onclick="selectDef(this)">${d.def}<div class="dot def-dot"></div></div>`;
  }

  setTimeout(initCanvas, 100);
}

function selectWord(el) {
  // Prevent selection if the board is locked for checking
  if (isLocked || el.classList.contains('correct') || el.querySelector('.def-dot')) return;

  document.querySelectorAll('#game-area .item').forEach(i => {
    if (!i.querySelector('.def-dot')) i.classList.remove('selected');
  });

  el.classList.add('selected');
  selectedWordEl = el;
}

function selectDef(el) {
  // Prevent selection if the board is locked for checking
  if (isLocked || !selectedWordEl || el.classList.contains('correct') || !el.querySelector('.def-dot')) return;

  const wordId = selectedWordEl.dataset.id;
  const defId = el.dataset.id;

  connections = connections.filter(c => c.wEl !== selectedWordEl);
  connections.push({ wId: wordId, dId: defId, wEl: selectedWordEl, dEl: el });

  selectedWordEl.classList.remove('selected');
  selectedWordEl = null;
  drawLines();
}

function initCanvas() {
  const canvas = document.getElementById('lineCanvas');
  const area = document.getElementById('game-area');
  if (!canvas || !area) return;

  canvas.width = area.clientWidth;
  canvas.height = area.clientHeight;
  drawLines();
}

function drawLines() {
  const canvas = document.getElementById('lineCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const areaRect = document.getElementById('game-area').getBoundingClientRect();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  connections.forEach(c => {
    const wDot = c.wEl.querySelector('.word-dot').getBoundingClientRect();
    const dDot = c.dEl.querySelector('.def-dot').getBoundingClientRect();

    const startX = wDot.left + (wDot.width / 2) - areaRect.left;
    const startY = wDot.top + (wDot.height / 2) - areaRect.top;
    const endX = dDot.left + (dDot.width / 2) - areaRect.left;
    const endY = dDot.top + (dDot.height / 2) - areaRect.top;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

function checkAnswers() {
  if (isLocked) return;
  isLocked = true; // Lock the board so users can't change answers
  let hasMistakes = false;

  // Check if they missed connecting any items
  if (connections.length < pairs.length) {
    hasMistakes = true;
  }

  connections.forEach(c => {
    if (c.wId === c.dId) {
      c.wEl.className = 'item correct';
      c.dEl.className = 'item correct';
    } else {
      c.wEl.classList.add('wrong');
      c.dEl.classList.add('wrong');
      hasMistakes = true;
      // Note: The timer that removed the 'wrong' class was deleted so errors stay visible
    }
  });

  // Dynamically morph the main button based on the results
  const checkBtn = document.querySelector('#controls button:first-child');
  if (hasMistakes) {
    checkBtn.innerText = "Learn Better !!!";
    checkBtn.onclick = resetRound;
    checkBtn.style.background = "var(--error)"; // Match the red error color
  } else {
    checkBtn.innerText = "Nice! Play Again?";
    checkBtn.onclick = startGame; // Completely reshuffles and starts over
    checkBtn.style.background = "var(--success)"; // Match the green success color
  }
}

// NEW FUNCTION: Clears the player's mistakes and lets them try drawing lines again
function resetRound() {
  isLocked = false;
  connections = [];
  selectedWordEl = null;

  // Wipe styling from all items
  document.querySelectorAll('#game-area .item').forEach(item => {
    item.className = 'item';
  });

  drawLines(); // Clears the visual canvas connections

  // Revert button back to default
  const checkBtn = document.querySelector('#controls button:first-child');
  checkBtn.innerText = "Check Results";
  checkBtn.onclick = checkAnswers;
  checkBtn.style.background = '';
}

function handleCSVUpload() {
  const fileInput = document.getElementById('csvFileInput');
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a CSV file first!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const rows = text.split(/\r?\n/).filter(row => row.trim() !== "");

    const parsedData = rows.map(row => {
      const firstComma = row.indexOf(',');
      if (firstComma === -1) return { word: row.trim(), def: "" };

      const word = row.substring(0, firstComma).trim();
      let def = row.substring(firstComma + 1).trim();

      if (def.startsWith('"') && def.endsWith('"')) {
        def = def.slice(1, -1).trim();
      }

      return { word, def };
    });

    if (parsedData.length > 0) {
      document.getElementById('rowCount').value = parsedData.length;
      generateInputs(parsedData);
      alert(`Successfully loaded ${parsedData.length} pairs!`);
    } else {
      alert("The CSV file appeared to be empty.");
    }
  };

  reader.readAsText(file);
}

// Initial binding hooks
window.onload = () => generateInputs();
window.onresize = initCanvas;
