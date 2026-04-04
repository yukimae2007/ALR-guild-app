// ギルドメンバー一覧
let members = [];

// ギルドメンバー登録
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

// プレイヤー名一覧（カードUI）
function updateMemberList() {
  const list = document.getElementById("memberList");
  if (!list) return;

  list.innerHTML = "";

  members.forEach(m => {
    const card = document.createElement("div");
    card.className = "adventurer-card";

    card.innerHTML = `
      <div class="card-header">
        <span class="rank-badge">Rank ${m.rank}</span>
        <h3 class="name">${m.name}</h3>
      </div>
      <div class="stat">⚔️ 戦闘力: ${m.power}</div>
      <div class="stat">🛡️ 部隊: ${m.team}</div>
    `;

    list.appendChild(card);
  });
}

// localStorage 保存
function saveData() {
  localStorage.setItem("guildMembers", JSON.stringify(members));
}

// localStorage 読み込み
function loadData() {
  const data = localStorage.getItem("guildMembers");
  if (data) {
    members = JSON.parse(data);
    updateMemberList();
  }
}

window.onload = loadData;

// パーティごとの戦闘力範囲取得
function getPartyRanges() {
  const ranges = [];

  for (let i = 1; i <= 6; i++) {
    const min = parseFloat(document.getElementById(`p${i}_min`)?.value) || 0;
    const max = parseFloat(document.getElementById(`p${i}_max`)?.value) || 9999;
    ranges.push({ min, max });
  }

  return ranges;
}

// パーティ自動編成（重複禁止＋範囲＋均一化）
function createGroups() {
  const ranges = getPartyRanges();

  // まだ使っていないメンバーだけを扱う（重複禁止）
  let availableMembers = [...members];

  const groups = [];

  for (let i = 0; i < 6; i++) {
    const { min, max } = ranges[i];

    // 条件に合うメンバーを抽出
    const filtered = availableMembers.filter(m => m.power >= min && m.power <= max);

    // 戦闘力順にソート
    filtered.sort((a, b) => b.power - a.power);

    // グループに追加
    groups.push({
      id: i + 1,
      members: filtered,
      totalPower: filtered.reduce((sum, m) => sum + m.power, 0)
    });

    // 使ったメンバーを除外（重複禁止）
    availableMembers = availableMembers.filter(m => !filtered.includes(m));
  }

  // Party2+3 / Party4〜6 の均一化
  balanceGroups(groups);

  renderGroups(groups);
}

// Party2 + Party3 と Party4〜6 の均一化
function balanceGroups(groups) {
  balanceGroupA(groups); // Party2 + Party3 の均一化
  balanceGroupB(groups); // Party4〜6 の均一化
  recalcTotals(groups);
  return groups;
}

// Party2 + Party3 の均一化
function balanceGroupA(groups) {
  const p2 = groups[1];
  const p3 = groups[2];
  if (!p2 || !p3) return;

  let diff = Math.abs(p2.totalPower - p3.totalPower);
  if (diff <= 5) return; // 差が小さければ何もしない

  const strongParty = p2.totalPower > p3.totalPower ? p2 : p3;
  const weakParty   = p2.totalPower > p3.totalPower ? p3 : p2;

  if (strongParty.members.length === 0) return;

  // 強いパーティから弱いパーティへ最適なメンバーを1人移動
  const candidate = strongParty.members.reduce((a, b) => {
    const diffA = Math.abs(
      (strongParty.totalPower - a.power) - (weakParty.totalPower + a.power)
    );
    const diffB = Math.abs(
      (strongParty.totalPower - b.power) - (weakParty.totalPower + b.power)
    );
    return diffA < diffB ? a : b;
  });

  strongParty.members = strongParty.members.filter(m => m !== candidate);
  weakParty.members.push(candidate);
}

// Party4〜6 の均一化
function balanceGroupB(groups) {
  const p4 = groups[3];
  const p5 = groups[4];
  const p6 = groups[5];
  if (!p4 || !p5 || !p6) return;

  const arr = [p4, p5, p6];

  // 戦闘力順に並べる
  arr.sort((a, b) => b.totalPower - a.totalPower);

  const strongest = arr[0];
  const weakest   = arr[2];

  const diff = strongest.totalPower - weakest.totalPower;
  if (diff <= 5) return;

  if (strongest.members.length === 0) return;

  // 最適な1人を弱いパーティへ移動
  const candidate = strongest.members.reduce((a, b) => {
    const diffA = Math.abs(
      (strongest.totalPower - a.power) - (weakest.totalPower + a.power)
    );
    const diffB = Math.abs(
      (strongest.totalPower - b.power) - (weakest.totalPower + b.power)
    );
    return diffA < diffB ? a : b;
  });

  strongest.members = strongest.members.filter(m => m !== candidate);
  weakest.members.push(candidate);
}

// totalPower 再計算
function recalcTotals(groups) {
  groups.forEach(g => {
    g.totalPower = g.members.reduce((sum, m) => sum + m.power, 0);
  });
}

// パーティUI表示
function renderGroups(groups) {
  const result = document.getElementById("result");
  if (!result) return;

  result.innerHTML = "";

  groups.forEach(g => {
    const div = document.createElement("div");
    div.className = "party";

    div.innerHTML = `
      <div class="party-header">
        <img src="emblem_${g.id}.png" class="party-emblem">
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

// ホーム画面切り替え
function showSection(section) {
  const home = document.getElementById("home");
  if (home) home.style.display = "none";

  if (section === "register") {
    window.scrollTo(0, 0);
  }
  if (section === "list") {
    window.scrollTo(0, 0);
  }
  if (section === "party") {
    window.scrollTo(0, 0);
  }
}
