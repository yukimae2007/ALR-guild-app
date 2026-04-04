// ===============================
// ギルドメンバー管理
// ===============================
let members = [];

// メンバー登録
function addMember() {
  const name = document.getElementById("name").value;
  const power = parseFloat(document.getElementById("power").value);
  const rank = parseInt(document.getElementById("rank").value);
  const team = document.getElementById("team").value;

  if (!name || isNaN(power) || isNaN(rank)) return;

  members.push({ name, power, rank, team });
  updateMemberList();
  saveData();
}

// ===============================
// メンバー一覧表示（削除＋編集対応）
// ===============================
function updateMemberList() {
  const list = document.getElementById("memberList");
  if (!list) return;

  list.innerHTML = "";

  members.forEach(m => {
    const card = document.createElement("div");
    card.className = "adventurer-card";

    card.innerHTML = `
      <div class="card-header">
        <span class="rank-badge editable" data-field="rank" data-id="${m.name}">Rank ${m.rank}</span>
        <h3 class="name editable" data-field="name" data-id="${m.name}">${m.name}</h3>
        <button class="delete-btn" onclick="deleteMember('${m.name}')">✖</button>
      </div>

      <div class="stat editable" data-field="power" data-id="${m.name}">
        ⚔️ 戦闘力: ${m.power}
      </div>

      <div class="stat editable" data-field="team" data-id="${m.name}">
        🛡️ 部隊: ${m.team}
      </div>
    `;

    list.appendChild(card);
  });
}

// ===============================
// カード削除機能
// ===============================
function deleteMember(name) {
  members = members.filter(m => m.name !== name);
  saveData();
  updateMemberList();
}

// ===============================
// カード編集（インライン編集）
// ===============================
document.addEventListener("click", function(e) {
  if (!e.target.classList.contains("editable")) return;

  const field = e.target.dataset.field;
  const id = e.target.dataset.id;

  let original = e.target.innerText
    .replace("⚔️ 戦闘力: ", "")
    .replace("🛡️ 部隊: ", "")
    .replace("Rank ", "");

  const input = document.createElement("input");
  input.type = "text";
  input.value = original;
  input.className = "edit-input";

  e.target.replaceWith(input);
  input.focus();

  input.addEventListener("keydown", function(ev) {
    if (ev.key === "Enter") {
      applyEdit(id, field, input.value);
    }
  });

  input.addEventListener("blur", function() {
    applyEdit(id, field, input.value);
  });
});

// 編集内容を反映
function applyEdit(id, field, value) {
  const member = members.find(m => m.name === id);
  if (!member) return;

  if (field === "power") member.power = parseFloat(value) || member.power;
  else if (field === "rank") member.rank = parseInt(value) || member.rank;
  else member[field] = value;

  saveData();
  updateMemberList();
}

// ===============================
// localStorage
// ===============================
function saveData() {
  localStorage.setItem("guildMembers", JSON.stringify(members));
}

function loadData() {
  const data = localStorage.getItem("guildMembers");
  if (data) {
    members = JSON.parse(data);
    updateMemberList();
  }
}

window.onload = loadData;

// ===============================
// パーティ範囲取得
// ===============================
function getPartyRanges() {
  const ranges = [];

  for (let i = 1; i <= 6; i++) {
    const min = parseFloat(document.getElementById(`p${i}_min`)?.value) || 0;
    const max = parseFloat(document.getElementById(`p${i}_max`)?.value) || 9999;
    ranges.push({ min, max });
  }

  return ranges;
}

// ===============================
// パーティ自動編成（重複禁止＋範囲＋均一化）
// ===============================
function createGroups() {
  const ranges = getPartyRanges();

  let availableMembers = [...members];
  const groups = [];

  // Party1〜6 を作成
  for (let i = 0; i < 6; i++) {
    const { min, max } = ranges[i];

    const filtered = availableMembers.filter(m => m.power >= min && m.power <= max);
    filtered.sort((a, b) => b.power - a.power);

    groups.push({
      id: i + 1,
      members: filtered,
      totalPower: filtered.reduce((sum, m) => sum + m.power, 0)
    });

    availableMembers = availableMembers.filter(m => !filtered.includes(m));
  }

  // 均一化処理（複数回ループ）
  balanceGroups(groups);

  // 表示
  renderGroups(groups);
}

// ===============================
// 均一化処理
// ===============================
function balanceGroups(groups) {
  for (let loop = 0; loop < 5; loop++) {
    balanceGroupA(groups); // Party2 + Party3
    balanceGroupB(groups); // Party4〜6
    recalcTotals(groups);
  }
}

// Party2 + Party3 の均一化
function balanceGroupA(groups) {
  const p2 = groups[1];
  const p3 = groups[2];
  if (!p2 || !p3) return;

  let diff = Math.abs(p2.totalPower - p3.totalPower);
  if (diff <= 3) return;

  const strong = p2.totalPower > p3.totalPower ? p2 : p3;
  const weak   = p2.totalPower > p3.totalPower ? p3 : p2;

  if (strong.members.length === 0) return;

  const candidate = strong.members.reduce((a, b) => {
    const diffA = Math.abs((strong.totalPower - a.power) - (weak.totalPower + a.power));
    const diffB = Math.abs((strong.totalPower - b.power) - (weak.totalPower + b.power));
    return diffA < diffB ? a : b;
  });

  strong.members = strong.members.filter(m => m !== candidate);
  weak.members.push(candidate);
}

// Party4〜6 の均一化
function balanceGroupB(groups) {
  const p4 = groups[3];
  const p5 = groups[4];
  const p6 = groups[5];
  if (!p4 || !p5 || !p6) return;

  const arr = [p4, p5, p6];
  arr.sort((a, b) => b.totalPower - a.totalPower);

  const strong = arr[0];
  const weak   = arr[2];

  let diff = strong.totalPower - weak.totalPower;
  if (diff <= 3) return;

  if (strong.members.length === 0) return;

  const candidate = strong.members.reduce((a, b) => {
    const diffA = Math.abs((strong.totalPower - a.power) - (weak.totalPower + a.power));
    const diffB = Math.abs((strong.totalPower - b.power) - (weak.totalPower + b.power));
    return diffA < diffB ? a : b;
  });

  strong.members = strong.members.filter(m => m !== candidate);
  weak.members.push(candidate);
}

// totalPower 再計算
function recalcTotals(groups) {
  groups.forEach(g => {
    g.totalPower = g.members.reduce((sum, m) => sum + m.power, 0);
  });
}

// ===============================
// パーティUI表示（アイコンなし版）
// ===============================
function renderGroups(groups) {
  const result = document.getElementById("result");
  if (!result) return;

  result.innerHTML = "";

  groups.forEach(g => {
    const div = document.createElement("div");
    div.className = "party";

    div.innerHTML = `
      <div class="party-header">
        <h2>Party ${g.id}</h2>
      </div>

      <div class="party-power">
        <span class="label">総合戦闘力</span>
        <span class="value">${g.totalPower.toFixed(1)}</span>
      </div>

      <div class="party-members">
        ${g.members.map(m => `
          <div class="adventurer-card">
            <div class="card-header">
              <span class="rank-badge">Rank ${m.rank}</span>
              <h3 class="name">${m.name}</h3>
            </div>
            <div class="stat">⚔️ 戦闘力: ${m.power}</div>
            <div class="stat">🛡️ 部隊: ${m.team}</div>
          </div>
        `).join("")}
      </div>
    `;

    result.appendChild(div);
  });
}

// ===============================
// 画面切り替え（重要）
// ===============================
function showSection(section) {
  document.getElementById("home").style.display = "none";
  document.getElementById("register").style.display = "none";
  document.getElementById("party").style.display = "none";

  document.getElementById(section).style.display = "block";
  window.scrollTo(0, 0);
}










 

  
 
