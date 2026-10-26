import { useMemo, useState } from 'react';

type FactionId = 'baron' | 'bene-gesserit' | 'emperor' | 'fremen';
type Terrain = 'sand' | 'rock' | 'oasis' | 'city';
type TerritoryId =
  | 'arrakeen'
  | 'carthag'
  | 'sietch-tabr'
  | 'hagga-sietch'
  | 'imperial-basin'
  | 'the-dune-sea'
  | 'red-mountain'
  | 'the-sink';

interface Territory {
  id: TerritoryId;
  name: string;
  terrain: Terrain;
  spice: number;
  control: FactionId | null;
  troops: Record<FactionId, number>;
  neighbors: TerritoryId[];
  x: number;
  y: number;
  w: number;
  h: number;
  points: string;
}

interface PlayerState {
  faction: FactionId;
  spice: number;
  water: number;
  solari: number;
  troops: number;
  influence: number;
}

interface GameState {
  round: number;
  currentTurn: FactionId;
  winner: FactionId | null;
  territories: Record<TerritoryId, Territory>;
  players: Record<FactionId, PlayerState>;
  log: string[];
}

interface BattleState {
  isOpen: boolean;
  attacker: FactionId | null;
  targetId: TerritoryId | null;
  attackRoll: number | null;
  defenseRoll: number | null;
  outcome: 'win' | 'loss' | 'draw' | null;
}

type TerritorySeed = Omit<Territory, 'troops'> & {
  troops?: Partial<Record<FactionId, number>>;
};

const factions: FactionId[] = ['baron', 'bene-gesserit', 'emperor', 'fremen'];
const order: FactionId[] = [...factions];
const battleWheelLabels = ['1', '2', '3', '4', '5', '6'];

const factionColors: Record<FactionId, string> = {
  baron: '#8ecae6',
  'bene-gesserit': '#b8f2e6',
  emperor: '#f7b267',
  fremen: '#ef476f',
};

const territoryBlueprint: Record<TerritoryId, Omit<Territory, 'control' | 'troops'>> = {
  arrakeen: {
    id: 'arrakeen',
    name: 'Arrakeen',
    terrain: 'city',
    spice: 4,
    neighbors: ['carthag', 'imperial-basin', 'the-dune-sea'],
    x: 550,
    y: 120,
    w: 160,
    h: 120,
    points: '560,160 620,120 710,170 670,245 590,245 540,200',
  },
  carthag: {
    id: 'carthag',
    name: 'Carthag',
    terrain: 'rock',
    spice: 2,
    neighbors: ['arrakeen', 'red-mountain', 'the-sink'],
    x: 250,
    y: 420,
    w: 170,
    h: 140,
    points: '250,450 335,420 420,470 380,560 260,585 220,510',
  },
  'sietch-tabr': {
    id: 'sietch-tabr',
    name: 'Sietch Tabr',
    terrain: 'oasis',
    spice: 1,
    neighbors: ['hagga-sietch', 'the-dune-sea'],
    x: 120,
    y: 220,
    w: 180,
    h: 150,
    points: '120,255 215,220 300,260 275,360 170,390 110,315',
  },
  'hagga-sietch': {
    id: 'hagga-sietch',
    name: 'Hagga Sietch',
    terrain: 'oasis',
    spice: 2,
    neighbors: ['sietch-tabr', 'the-dune-sea', 'red-mountain'],
    x: 245,
    y: 345,
    w: 170,
    h: 120,
    points: '250,360 335,345 410,385 385,470 295,500 240,445',
  },
  'imperial-basin': {
    id: 'imperial-basin',
    name: 'Imperial Basin',
    terrain: 'sand',
    spice: 5,
    neighbors: ['arrakeen', 'the-dune-sea', 'the-sink'],
    x: 370,
    y: 250,
    w: 200,
    h: 170,
    points: '390,260 520,245 610,290 585,400 470,450 390,390',
  },
  'the-dune-sea': {
    id: 'the-dune-sea',
    name: 'The Dune Sea',
    terrain: 'sand',
    spice: 6,
    neighbors: ['arrakeen', 'sietch-tabr', 'hagga-sietch', 'imperial-basin', 'red-mountain'],
    x: 345,
    y: 350,
    w: 240,
    h: 190,
    points: '350,390 480,350 620,395 635,540 520,610 385,590 330,470',
  },
  'red-mountain': {
    id: 'red-mountain',
    name: 'Red Mountain',
    terrain: 'rock',
    spice: 3,
    neighbors: ['carthag', 'hagga-sietch', 'the-dune-sea', 'the-sink'],
    x: 620,
    y: 430,
    w: 180,
    h: 160,
    points: '650,470 760,430 820,500 785,610 675,650 610,580',
  },
  'the-sink': {
    id: 'the-sink',
    name: 'The Sink',
    terrain: 'sand',
    spice: 2,
    neighbors: ['carthag', 'imperial-basin', 'red-mountain'],
    x: 480,
    y: 600,
    w: 160,
    h: 120,
    points: '490,640 560,610 640,655 620,725 520,745 470,690',
  },
};

const territorySeedList: TerritorySeed[] = Object.values(territoryBlueprint).map((territory) => ({
  ...territory,
  control: null,
  troops: {},
}));

const emptyTroops: Record<FactionId, number> = {
  baron: 0,
  'bene-gesserit': 0,
  emperor: 0,
  fremen: 0,
};

const randomDie = (mod = 6) => Math.floor(Math.random() * mod) + 1;

function createInitialGameState(): GameState {
  const territories = territorySeedList.reduce<Record<TerritoryId, Territory>>((acc, territory) => {
    const initial = {
      ...territory,
      control: territory.id === 'arrakeen' ? 'emperor' : territory.id === 'red-mountain' ? 'bene-gesserit' : territory.id === 'sietch-tabr' ? 'fremen' : territory.id === 'carthag' ? 'baron' : null,
      troops: {
        ...emptyTroops,
        ...(territory.troops ?? {}),
      },
    };

    if (initial.control === 'emperor') initial.troops.emperor = 3;
    if (initial.control === 'baron') initial.troops.baron = 2;
    if (initial.control === 'fremen') initial.troops.fremen = 3;
    if (initial.control === 'bene-gesserit') initial.troops['bene-gesserit'] = 2;

    acc[territory.id] = initial as Territory;
    return acc;
  }, {} as Record<TerritoryId, Territory>);

  return {
    round: 1,
    currentTurn: 'baron',
    winner: null,
    territories,
    players: {
      baron: { faction: 'baron', spice: 3, water: 2, solari: 4, troops: 8, influence: 1 },
      'bene-gesserit': { faction: 'bene-gesserit', spice: 2, water: 2, solari: 5, troops: 7, influence: 1 },
      emperor: { faction: 'emperor', spice: 3, water: 2, solari: 4, troops: 9, influence: 2 },
      fremen: { faction: 'fremen', spice: 2, water: 4, solari: 3, troops: 8, influence: 1 },
    },
    log: ['The spice wars begin on Arrakis.'],
  };
}

function getControlCount(state: GameState, faction: FactionId) {
  return Object.values(state.territories).filter((territory) => territory.control === faction).length;
}

function updateWinner(state: GameState): GameState {
  const next = { ...state };
  for (const faction of factions) {
    const controlCount = getControlCount(next, faction);
    const spiceTotal = next.players[faction].spice;
    if (controlCount >= 4 || spiceTotal >= 18) {
      next.winner = faction;
      next.log = [...next.log, `${faction} wins the political struggle for Arrakis.`];
      return next;
    }
  }
  return next;
}

function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGameState());
  const [selectedId, setSelectedId] = useState<TerritoryId | null>('arrakeen');
  const [battleState, setBattleState] = useState<BattleState>({
    isOpen: false,
    attacker: null,
    targetId: null,
    attackRoll: null,
    defenseRoll: null,
    outcome: null,
  });
  const [battleRotation, setBattleRotation] = useState(0);

  const selectedTerritory = selectedId ? game.territories[selectedId] : null;
  const currentPlayer = game.players[game.currentTurn];

  const collectSpice = () => {
    if (game.winner) return;
    const next = structuredClone(game);
    const controlled = Object.values(next.territories).filter((territory) => territory.control === next.currentTurn);
    const bonus = controlled.reduce((sum, territory) => sum + territory.spice, 0);
    next.players[next.currentTurn].spice += bonus;
    next.log = [...next.log, `${next.currentTurn} collects ${bonus} spice.`];
    setGame(updateWinner(next));
  };

  const reinforceSelected = () => {
    if (!selectedTerritory || game.winner) return;
    const territory = game.territories[selectedId!];
    if (territory.control !== game.currentTurn) {
      setGame({ ...game, log: [...game.log, 'You can only reinforce your own territory.'] });
      return;
    }
    const next = structuredClone(game);
    if (next.players[next.currentTurn].troops <= 0) {
      next.log = [...next.log, 'No reserve troops available.'];
      setGame(next);
      return;
    }
    next.territories[selectedId!].troops[next.currentTurn] += 1;
    next.players[next.currentTurn].troops -= 1;
    next.log = [...next.log, `${next.currentTurn} reinforces ${territory.name}.`];
    setGame(updateWinner(next));
  };

  const advanceTurn = () => {
    if (game.winner) return;
    const currentIndex = order.indexOf(game.currentTurn);
    const nextFaction = order[(currentIndex + 1) % order.length];
    setGame({
      ...game,
      currentTurn: nextFaction,
      round: nextFaction === 'baron' ? game.round + 1 : game.round,
      log: [...game.log, `${nextFaction} takes the next turn.`],
    });
  };

  const openBattleWheel = () => {
    if (!selectedTerritory || game.winner) return;
    const currentFaction = game.currentTurn;
    const target = selectedTerritory;
    if (target.control === currentFaction) {
      setGame({ ...game, log: [...game.log, 'You cannot attack your own territory.'] });
      return;
    }
    const isAdjacent = Object.values(game.territories).some(
      (territory) => territory.control === currentFaction && target.neighbors.includes(territory.id),
    );
    if (!isAdjacent && target.control !== null) {
      setGame({ ...game, log: [...game.log, `${target.name} is not adjacent to one of your territories.`] });
      return;
    }
    setBattleState({
      isOpen: true,
      attacker: currentFaction,
      targetId: target.id,
      attackRoll: null,
      defenseRoll: null,
      outcome: null,
    });
  };

  const resolveBattle = () => {
    if (!battleState.attacker || !battleState.targetId) return;
    const next = structuredClone(game);
    const attacker = battleState.attacker;
    const target = next.territories[battleState.targetId];
    const defender = target.control ?? attacker;
    const attackRoll = randomDie() + next.players[attacker].influence + (target.terrain === 'city' ? 1 : 0);
    const defenseRoll = randomDie() + (target.troops[defender] || 0) + (target.terrain === 'oasis' ? 1 : 0);
    const outcome = attackRoll > defenseRoll ? 'win' : attackRoll < defenseRoll ? 'loss' : 'draw';
    const wheelTurn = 1080 + Math.floor(Math.random() * 1440);
    setBattleRotation(wheelTurn);

    if (outcome === 'win') {
      target.control = attacker;
      target.troops[defender] = 0;
      target.troops[attacker] += 1;
      next.players[attacker].spice += target.spice;
      next.log = [...next.log, `${attacker} wins the battle for ${target.name} (${attackRoll} vs ${defenseRoll}).`];
      setGame(updateWinner(next));
    } else if (outcome === 'loss') {
      target.troops[attacker] = Math.max(0, (target.troops[attacker] || 0) - 1);
      next.log = [...next.log, `${attacker} loses the battle for ${target.name} (${attackRoll} vs ${defenseRoll}).`];
      setGame(updateWinner(next));
    } else {
      next.log = [...next.log, `${attacker} and ${defender} draw at ${target.name}.`];
      setGame(updateWinner(next));
    }

    setBattleState({
      isOpen: false,
      attacker: null,
      targetId: null,
      attackRoll,
      defenseRoll,
      outcome,
    });
  };

  const wheelSegments = battleWheelLabels.map((label, idx) => ({
    label,
    color: idx % 2 === 0 ? '#f3d27d' : '#8b5e3c',
    angle: (360 / battleWheelLabels.length) * idx,
  }));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="title-panel">
          <p className="eyebrow">1979 rules prototype</p>
          <h1>Imperium of Arrakis</h1>
        </div>

        <div className="turn-card">
          <span>Round</span>
          <strong>{game.round}</strong>
          <span>Current turn</span>
          <strong>{game.currentTurn}</strong>
        </div>

        <div className="faction-list">
          {factions.map((faction) => (
            <div key={faction} className={`faction-row ${game.currentTurn === faction ? 'active' : ''}`}>
              <span style={{ color: factionColors[faction] }}>{faction}</span>
              <b>{game.players[faction].spice} spice</b>
            </div>
          ))}
        </div>

        <div className="tools">
          <button onClick={collectSpice}>Collect spice</button>
          <button onClick={reinforceSelected}>Reinforce</button>
          <button onClick={openBattleWheel}>Battle wheel</button>
          <button className="secondary" onClick={advanceTurn}>End turn</button>
        </div>

        <div className="player-panel">
          <h3>{currentPlayer.faction}</h3>
          <ul>
            <li>Spice: {currentPlayer.spice}</li>
            <li>Water: {currentPlayer.water}</li>
            <li>Solari: {currentPlayer.solari}</li>
            <li>Troops: {currentPlayer.troops}</li>
            <li>Influence: {currentPlayer.influence}</li>
          </ul>
        </div>
      </aside>

      <main className="board-panel">
        <div className="board-shell">
          <svg className="map-svg" viewBox="0 0 900 900" role="img" aria-label="Dune board map">
            <defs>
              <pattern id="sandPattern" width="18" height="18" patternUnits="userSpaceOnUse">
                <rect width="18" height="18" fill="#d7b07e" />
                <circle cx="3" cy="6" r="2.4" fill="#ccb07a" opacity="0.5" />
                <circle cx="13" cy="12" r="1.6" fill="#c89d5a" opacity="0.5" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="900" height="900" fill="url(#sandPattern)" />
            <circle cx="455" cy="455" r="390" fill="rgba(0,0,0,0.12)" />
            <image href="/dune_board.png" x="0" y="0" width="900" height="900" preserveAspectRatio="xMidYMid meet" opacity="0.9" />

            {Object.values(game.territories).map((territory) => {
              const isSelected = selectedId === territory.id;
              const isControlled = territory.control === game.currentTurn;
              const fill = territory.control ? factionColors[territory.control] : '#d9bb87';

              return (
                <g key={territory.id} onClick={() => setSelectedId(territory.id)} className="territory-group">
                  <polygon
                    points={territory.points}
                    fill={fill}
                    opacity={isSelected ? 0.9 : 0.7}
                    stroke={isSelected ? '#fff7d6' : '#3a2615'}
                    strokeWidth={isSelected ? 4 : 2}
                    className={isControlled ? 'selected-territory' : ''}
                  />
                  <text x={territory.x + territory.w / 2} y={territory.y + territory.h / 2} textAnchor="middle" className="territory-label">
                    {territory.name}
                  </text>
                  <text x={territory.x + territory.w / 2} y={territory.y + territory.h / 2 + 16} textAnchor="middle" className="territory-subtext">
                    {territory.spice} spice
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="side-stack">
          <div className="details-panel">
            <h3>{selectedTerritory?.name ?? 'Select a territory'}</h3>
            {selectedTerritory && (
              <>
                <p>Terrain: {selectedTerritory.terrain}</p>
                <p>Spice yield: {selectedTerritory.spice}</p>
                <p>Controlled by: {selectedTerritory.control ?? 'neutral'}</p>
                <div className="troop-breakdown">
                  {factions.map((faction) => (
                    <span key={faction}>
                      {faction}: {selectedTerritory.troops[faction]}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="battle-panel">
            <h3>Battle wheel</h3>
            <div className="battle-wheel-wrap">
              <div className="battle-wheel" style={{ transform: `rotate(${battleRotation}deg)` }}>
                {wheelSegments.map((segment) => (
                  <span
                    key={segment.label}
                    className="battle-segment"
                    style={{
                      transform: `rotate(${segment.angle}deg)`,
                      background: segment.color,
                    }}
                  >
                    {segment.label}
                  </span>
                ))}
              </div>
              <div className="battle-pointer" />
            </div>
            <div className="battle-controls">
              <button className="secondary" onClick={resolveBattle}>Resolve combat</button>
            </div>
          </div>

          <div className="log-panel">
            <h3>War log</h3>
            <ul>
              {game.log.slice(-8).map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
