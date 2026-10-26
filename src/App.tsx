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
  emperor: '#ffb703',
  fremen: '#f77f00',
};

const territoryConfig: TerritorySeed[] = [
  {
    id: 'arrakeen',
    name: 'Arrakeen',
    terrain: 'city',
    spice: 4,
    control: 'emperor',
    neighbors: ['carthag', 'imperial-basin', 'the-dune-sea'],
    troops: { emperor: 3, baron: 1 },
  },
  {
    id: 'carthag',
    name: 'Carthag',
    terrain: 'rock',
    spice: 2,
    control: 'baron',
    neighbors: ['arrakeen', 'red-mountain', 'the-sink'],
    troops: { baron: 2 },
  },
  {
    id: 'sietch-tabr',
    name: 'Sietch Tabr',
    terrain: 'oasis',
    spice: 1,
    control: 'fremen',
    neighbors: ['hagga-sietch', 'the-dune-sea'],
    troops: { fremen: 3 },
  },
  {
    id: 'hagga-sietch',
    name: 'Hagga Sietch',
    terrain: 'oasis',
    spice: 2,
    control: null,
    neighbors: ['sietch-tabr', 'the-dune-sea', 'red-mountain'],
    troops: {},
  },
  {
    id: 'imperial-basin',
    name: 'Imperial Basin',
    terrain: 'sand',
    spice: 5,
    control: 'emperor',
    neighbors: ['arrakeen', 'the-dune-sea', 'the-sink'],
    troops: { emperor: 4 },
  },
  {
    id: 'the-dune-sea',
    name: 'The Dune Sea',
    terrain: 'sand',
    spice: 6,
    control: null,
    neighbors: ['arrakeen', 'sietch-tabr', 'hagga-sietch', 'imperial-basin', 'red-mountain'],
    troops: {},
  },
  {
    id: 'red-mountain',
    name: 'Red Mountain',
    terrain: 'rock',
    spice: 3,
    control: 'bene-gesserit',
    neighbors: ['carthag', 'hagga-sietch', 'the-dune-sea', 'the-sink'],
    troops: { 'bene-gesserit': 2 },
  },
  {
    id: 'the-sink',
    name: 'The Sink',
    terrain: 'sand',
    spice: 2,
    control: null,
    neighbors: ['carthag', 'imperial-basin', 'red-mountain'],
    troops: {},
  },
];

const emptyTroops: Record<FactionId, number> = {
  baron: 0,
  'bene-gesserit': 0,
  emperor: 0,
  fremen: 0,
};

const randomDie = (mod = 6) => Math.floor(Math.random() * mod) + 1;

function createInitialGameState(): GameState {
  const territories = territoryConfig.reduce<Record<TerritoryId, Territory>>((acc, territory) => {
    acc[territory.id] = {
      ...territory,
      troops: { ...emptyTroops, ...(territory.troops ?? {}) },
    };
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
    log: ['The spice wars begin.'],
  };
}

function getTerritoryControlCount(state: GameState, faction: FactionId) {
  return Object.values(state.territories).filter((territory) => territory.control === faction).length;
}

function updateWinner(state: GameState): GameState {
  const next = { ...state };

  for (const faction of factions) {
    const territoryCount = getTerritoryControlCount(next, faction);
    const spiceTotal = next.players[faction].spice;
    if (territoryCount >= 4 || spiceTotal >= 18) {
      next.winner = faction;
      next.log = [...next.log, `${faction} claims victory in the desert.`];
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
  const visibleTerritories = useMemo(() => Object.values(game.territories), [game.territories]);
  const currentPlayer = game.players[game.currentTurn];

  const collectSpice = () => {
    if (game.winner) return;

    const next: GameState = structuredClone(game);
    const controlled = Object.values(next.territories).filter((territory) => territory.control === next.currentTurn);
    const bonus = controlled.reduce((sum, territory) => sum + territory.spice, 0);

    next.players[next.currentTurn].spice += bonus;
    next.log = [...next.log, `${next.currentTurn} collects ${bonus} spice.`];

    const resolved = updateWinner(next);
    setGame(resolved);
  };

  const reinforceSelected = () => {
    if (!selectedTerritory || game.winner) return;

    const territory = game.territories[selectedId!];
    if (territory.control !== game.currentTurn) {
      setGame({ ...game, log: [...game.log, 'You can only reinforce your own territory.'] });
      return;
    }

    const next: GameState = structuredClone(game);
    if (next.players[next.currentTurn].troops <= 0) {
      next.log = [...next.log, 'No troops available for reinforcement.'];
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

    const nextState: GameState = {
      ...game,
      currentTurn: nextFaction,
      round: nextFaction === 'baron' ? game.round + 1 : game.round,
      log: [...game.log, `${nextFaction} takes the next turn.`],
    };

    setGame(nextState);
  };

  const openBattleWheel = () => {
    if (!selectedTerritory || game.winner) return;

    const currentFaction = game.currentTurn;
    const target = selectedTerritory;

    if (target.control === currentFaction) {
      setGame({ ...game, log: [...game.log, 'You cannot attack your own territory.'] });
      return;
    }

    const adjacentToOwn = Object.values(game.territories).some(
      (territory) => territory.control === currentFaction && target.neighbors.includes(territory.id),
    );

    if (!adjacentToOwn && target.control !== null) {
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

    const next: GameState = structuredClone(game);
    const attacker = battleState.attacker;
    const target = next.territories[battleState.targetId];
    const defender = target.control ?? attacker;

    const attackRoll = randomDie() + next.players[attacker].influence + (target.terrain === 'city' ? 1 : 0);
    const defenseRoll = randomDie() + (target.troops[defender] || 0) + (target.terrain === 'oasis' ? 1 : 0);
    const outcome = attackRoll > defenseRoll ? 'win' : attackRoll < defenseRoll ? 'loss' : 'draw';
    const wheelTurn = 1080 + Math.floor(Math.random() * 1440);

    setBattleRotation(wheelTurn);
    setBattleState({
      ...battleState,
      attackRoll,
      defenseRoll,
      outcome,
    });

    if (outcome === 'win') {
      target.control = attacker;
      target.troops[defender] = 0;
      target.troops[attacker] += 1;
      next.players[attacker].spice += target.spice;
      next.log = [...next.log, `${attacker} wins the battle for ${target.name} with ${attackRoll} to ${defenseRoll}.`];
      setGame(updateWinner(next));
    } else if (outcome === 'loss') {
      target.troops[attacker] = Math.max(0, (target.troops[attacker] || 0) - 1);
      next.log = [...next.log, `${attacker} loses the battle for ${target.name} (${attackRoll} vs ${defenseRoll}).`];
      setGame(updateWinner(next));
    } else {
      next.log = [...next.log, `${attacker} and ${defender} are locked in a stalemate at ${target.name}.`];
      setGame(updateWinner(next));
    }

    setBattleState({
      isOpen: false,
      attacker: null,
      targetId: null,
      attackRoll: null,
      defenseRoll: null,
      outcome: null,
    });
  };

  const wheelSegments = battleWheelLabels.map((label, idx) => ({
    label,
    color: idx % 2 === 0 ? '#e9c46a' : '#7a4d2a',
    angle: (360 / battleWheelLabels.length) * idx,
  }));

  const boardSegments = [
    { id: 'arrakeen', x: 54, y: 14, w: 25, h: 18 },
    { id: 'imperial-basin', x: 47, y: 30, w: 28, h: 18 },
    { id: 'the-dune-sea', x: 38, y: 41, w: 35, h: 21 },
    { id: 'red-mountain', x: 62, y: 50, w: 22, h: 16 },
    { id: 'the-sink', x: 58, y: 66, w: 24, h: 16 },
    { id: 'carthag', x: 25, y: 62, w: 22, h: 15 },
    { id: 'sietch-tabr', x: 12, y: 34, w: 24, h: 19 },
    { id: 'hagga-sietch', x: 23, y: 48, w: 22, h: 16 },
  ] as const;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="title-panel">
          <p className="eyebrow">Dune strategy prototype</p>
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
        <div className="board-scene">
          <div className="board-circle">
            {boardSegments.map((segment) => {
              const territory = game.territories[segment.id as TerritoryId];
              const isSelected = selectedId === territory.id;
              const isControlled = territory.control === game.currentTurn;

              return (
                <button
                  key={territory.id}
                  className={`land-segment ${isSelected ? 'selected' : ''} ${isControlled ? 'controlled' : ''}`}
                  onClick={() => setSelectedId(territory.id)}
                  style={{
                    left: `${segment.x}%`,
                    top: `${segment.y}%`,
                    width: `${segment.w}%`,
                    height: `${segment.h}%`,
                    background: isControlled
                      ? `linear-gradient(135deg, ${factionColors[game.currentTurn]}, rgba(72, 52, 30, 0.9))`
                      : 'linear-gradient(135deg, rgba(175, 128, 73, 0.9), rgba(120, 84, 51, 0.86))',
                  }}
                >
                  <span>{territory.name}</span>
                  <small>{territory.spice} spice</small>
                </button>
              );
            })}

            <div className="board-label dune-word">DUNE</div>
            <div className="board-label spice-bank">SPICE BANK</div>
            <div className="board-label move-track">TERRITORY TRACK</div>
          </div>
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
