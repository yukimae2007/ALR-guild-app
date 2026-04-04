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

    availableMembers = availableMembers