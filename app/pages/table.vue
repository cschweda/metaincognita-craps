<script setup lang="ts">
import type { BetType } from '~/utils/betTypes'
import { BET_TYPE_TO_ZONE } from '~/utils/betTypes'
import { crapsConfig } from '~~/craps.config'
import { rollDice } from '~/engine/rng'
import { canRemoveBet } from '~/engine/betting'

const store = useCrapsStore()
const router = useRouter()
const { placeBet, validateBet, removeBet } = useBetManager()
const { executeRoll } = useGameLoop()
const toast = useToast()

// ── Zone mapping ──
const ZONE_TO_BET_TYPE: Record<string, BetType> = {} as Record<string, BetType>
for (const [betType, zoneId] of Object.entries(BET_TYPE_TO_ZONE)) {
  ZONE_TO_BET_TYPE[zoneId] = betType as BetType
}

// ── Init: load session or redirect ──
onMounted(() => {
  if (store.phase === 'SETUP') {
    const loaded = store.loadFromLocalStorage()
    if (!loaded) {
      router.replace('/')
      return
    }
  }
})

// ── Dice state ──
const diceRolling = ref(false)
const pendingDie1 = ref<number | null>(null)
const pendingDie2 = ref<number | null>(null)
const displayDie1 = computed(() => pendingDie1.value ?? store.currentRoll?.die1 ?? null)
const displayDie2 = computed(() => pendingDie2.value ?? store.currentRoll?.die2 ?? null)

// ── Rapid play mode (skip animations) ──
const rapidPlay = ref(false)
const rollDelay = computed(() => rapidPlay.value ? 50 : 800)

// ── Auto-roll ──
const autoRoll = ref(false)
const autoRollSpeed = ref(2000) // ms between rolls
const autoRollCountdown = ref(0)
let autoRollInterval: ReturnType<typeof setInterval> | null = null

function startAutoRollTimer() {
  stopAutoRollTimer()
  if (!autoRoll.value || !canRoll.value) return
  autoRollCountdown.value = autoRollSpeed.value
  autoRollInterval = setInterval(() => {
    autoRollCountdown.value -= 100
    if (autoRollCountdown.value <= 0) {
      stopAutoRollTimer()
      handleRoll()
    }
  }, 100)
}

function stopAutoRollTimer() {
  if (autoRollInterval) {
    clearInterval(autoRollInterval)
    autoRollInterval = null
  }
  autoRollCountdown.value = 0
}

watch(autoRoll, (on) => {
  if (!on) stopAutoRollTimer()
})

// All one-shot timers are tracked so leaving the table cancels them
const pendingTimers = new Set<ReturnType<typeof setTimeout>>()
function trackedTimeout(fn: () => void, ms: number) {
  const id = setTimeout(() => {
    pendingTimers.delete(id)
    fn()
  }, ms)
  pendingTimers.add(id)
}

// ── Take-down mode ──
const takeDownMode = ref(false)

// ── Study mode (pauses game, shows zone explanations on hover) ──
const studyMode = ref(false)
watch(studyMode, (on) => {
  if (on) stopAutoRollTimer()
})

// ── Same Bet tracking ──
const lastBetConfig = ref<Array<{ type: BetType, amount: number }>>([])

function saveCurrentBets() {
  lastBetConfig.value = store.activeBets
    .filter(b => b.owner === 'hero' && b.status !== 'resolved')
    .map(b => ({ type: b.type, amount: b.amount }))
}

function placeSameBet() {
  if (lastBetConfig.value.length === 0) return
  for (const prev of lastBetConfig.value) {
    // Skip bets that are already active
    const alreadyHas = store.activeBets.some(
      b => b.owner === 'hero' && b.type === prev.type && b.status !== 'resolved'
    )
    if (alreadyHas) continue
    // Skip bets invalid for current phase
    const validation = validateBet(prev.type, prev.amount, 'hero', {
      phase: store.phase, point: store.point, activeBets: store.activeBets,
      tableRules: store.tableRules, rollNumber: store.rollNumber,
      dontBetRemovedThisCycle: store.dontBetRemovedThisCycle
    })
    if (validation.valid) {
      placeBet(prev.type, prev.amount, 'hero')
    }
  }
}

// ── Disabled zones ──
const EMPTY_SET = new Set<string>()

const disabledZones = computed(() => {
  const disabled = new Set<string>()
  for (const [zoneId, betType] of Object.entries(ZONE_TO_BET_TYPE)) {
    const validation = validateBet(betType, store.selectedChipValue, 'hero', {
      phase: store.phase, point: store.point, activeBets: store.activeBets,
      tableRules: store.tableRules, rollNumber: store.rollNumber,
      dontBetRemovedThisCycle: store.dontBetRemovedThisCycle
    })
    if (!validation.valid) disabled.add(zoneId)
  }
  return disabled
})

// ── Hop bet target picker ──
const hopPicker = ref<{ open: boolean, type: 'hopEasy' | 'hopHard' }>({ open: false, type: 'hopHard' })
const hopTargets = computed(() =>
  hopPicker.value.type === 'hopHard' ? [4, 6, 8, 10] : [3, 4, 5, 6, 7, 8, 9, 10, 11]
)
function placeHopBet(target: number) {
  hopPicker.value.open = false
  placeBet(hopPicker.value.type, store.selectedChipValue, 'hero', target)
}

// ── Zone click: place or remove ──
function handleZoneClick(zoneId: string) {
  if (studyMode.value) return
  if (takeDownMode.value) {
    // Remove the hero's bet on this zone
    const bet = store.activeBets.find(
      b => b.owner === 'hero' && BET_TYPE_TO_ZONE[b.type] === zoneId && b.status !== 'resolved'
    )
    if (bet) {
      const removal = canRemoveBet(bet, store.point)
      if (!removal.allowed) {
        toast.add({ title: 'Cannot take down', description: removal.reason, color: 'warning' })
        return
      }
      removeBet(bet.id)
    }
    return
  }
  const betType = ZONE_TO_BET_TYPE[zoneId]
  if (!betType) return
  if (betType === 'hopEasy' || betType === 'hopHard') {
    hopPicker.value = { open: true, type: betType }
    if (autoRoll.value) stopAutoRollTimer()
    return
  }
  const placed = placeBet(betType, store.selectedChipValue, 'hero')
  if (!placed) {
    const validation = validateBet(betType, store.selectedChipValue, 'hero', {
      phase: store.phase, point: store.point, activeBets: store.activeBets,
      tableRules: store.tableRules, rollNumber: store.rollNumber,
      dontBetRemovedThisCycle: store.dontBetRemovedThisCycle
    })
    toast.add({ title: 'Bet not placed', description: validation.reason || 'Not available right now', color: 'warning' })
  }
  // Pause auto-roll when hero interacts
  if (autoRoll.value) stopAutoRollTimer()
}

// ── Roll logic ──
const heroHasLineBet = computed(() =>
  store.activeBets.some(b => b.owner === 'hero' && b.status !== 'resolved' && (b.type === 'pass' || b.type === 'dontPass'))
)

const canRoll = computed(() =>
  !diceRolling.value && !studyMode.value && ['COME_OUT', 'POINT_PHASE'].includes(store.phase) && heroHasLineBet.value
)

const rollBlockedReason = computed(() => {
  if (diceRolling.value) return 'Rolling...'
  if (!['COME_OUT', 'POINT_PHASE'].includes(store.phase)) return 'Waiting for next phase'
  if (!heroHasLineBet.value) return 'Place a Pass Line or Don\'t Pass bet first (MBS Rule 3.7)'
  return ''
})

// ── Payout animations ──
const payoutFloaters = ref<Array<{ id: number, text: string, type: 'win' | 'lose' | 'push', x: number }>>([])
let floaterId = 0

function showPayoutAnimations() {
  const heroRes = store.lastResolutions.filter(r => r.owner === 'hero')
  payoutFloaters.value = []
  let delay = 0
  for (const res of heroRes) {
    const id = ++floaterId
    const text = res.outcome === 'win'
      ? `+${formatCents(res.netGain)}`
      : res.outcome === 'lose'
        ? formatCents(res.netGain)
        : 'Push'
    const x = 300 + (delay * 80) // stagger horizontally
    trackedTimeout(() => {
      payoutFloaters.value.push({ id, text, type: res.outcome as 'win' | 'lose' | 'push', x })
      // Remove after animation
      trackedTimeout(() => {
        payoutFloaters.value = payoutFloaters.value.filter(f => f.id !== id)
      }, 1500)
    }, delay * 200)
    delay++
  }
}

function handleRoll() {
  if (!canRoll.value) return
  stopAutoRollTimer()

  // Save bet config before roll (for Same Bet)
  saveCurrentBets()

  const { die1: d1, die2: d2 } = rollDice()
  pendingDie1.value = d1
  pendingDie2.value = d2
  diceRolling.value = true

  trackedTimeout(() => {
    try {
      executeRoll(d1, d2)
      if (!rapidPlay.value) showPayoutAnimations()
    } finally {
      pendingDie1.value = null
      pendingDie2.value = null
      diceRolling.value = false
    }
    // Queue next auto-roll if enabled
    if (autoRoll.value) {
      trackedTimeout(() => startAutoRollTimer(), rapidPlay.value ? 100 : 500)
    }
  }, rollDelay.value)
}

// ── Keyboard: spacebar to roll ──
function onKeydown(e: KeyboardEvent) {
  if (e.code === 'Space' && canRoll.value && !diceRolling.value) {
    e.preventDefault()
    handleRoll()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))

// ── Flush throttled session state on tab close/hide and unmount ──
function flushSession() {
  store.saveToLocalStorage()
}
onMounted(() => window.addEventListener('pagehide', flushSession))

// All cleanup on unmount: stop timers, drop listeners, flush session state
onUnmounted(() => {
  stopAutoRollTimer()
  pendingTimers.forEach(t => clearTimeout(t))
  pendingTimers.clear()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('pagehide', flushSession)
  flushSession()
})

// ── Shooter info ──
const currentShooterName = computed(() => {
  const shooter = store.players[store.shooterSeat]
  return shooter?.name ?? 'Unknown'
})
const heroIsShooting = computed(() => store.shooterSeat === 0)

// ── New game ──
const showNewGameConfirm = ref(false)
function requestNewGame() {
  showNewGameConfirm.value = true
}
function confirmNewGame() {
  store.clearSession()
  router.push('/')
}

// ── Sidebar ──
const showSidebar = ref(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true)
const hero = computed(() => store.hero)

// ── Advisor "DO THIS" handler ──
function handleAdvisorBet(betType: BetType) {
  if (studyMode.value) return

  // For odds bets, place max odds
  if (betType === 'passOdds' || betType === 'dontPassOdds') {
    const lineType = betType === 'passOdds' ? 'pass' : 'dontPass'
    const lineBet = store.activeBets.find(
      b => b.owner === 'hero' && b.type === lineType && b.status !== 'resolved'
    )
    if (!lineBet || !store.point) return
    const multiples = crapsConfig.oddsMultiples[store.tableRules.oddsMultiple]
    const maxMultiple = multiples?.[store.point] ?? 1
    placeBet(betType, lineBet.amount * maxMultiple, 'hero')
    return
  }

  // For all other bets, place at the currently selected chip value
  placeBet(betType, store.selectedChipValue, 'hero')
}
</script>

<template>
  <div class="table-page flex-1 bg-neutral-950 flex flex-col min-h-0">
    <!-- Top bar -->
    <header class="relative z-40 flex flex-wrap items-center justify-between gap-y-1 px-4 py-2 bg-neutral-900/80 border-b border-neutral-800">
      <div class="flex items-center gap-3">
        <span class="text-amber-400 font-bold text-sm">{{ hero?.name ?? 'Player' }}</span>
        <span class="text-neutral-300 font-mono text-sm">
          {{ hero ? formatCents(hero.bankroll) : '--' }}
        </span>
        <span
          v-if="hero"
          class="text-xs font-mono"
          :class="(hero.bankroll - hero.startingBankroll) >= 0 ? 'text-emerald-400' : 'text-red-400'"
        >
          ({{ (hero.bankroll - hero.startingBankroll) >= 0 ? '+' : '' }}{{ formatCents(hero.bankroll - hero.startingBankroll) }})
        </span>
        <span
          v-if="!heroIsShooting"
          class="text-xs text-neutral-500 ml-2"
        >
          Shooter: {{ currentShooterName }}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-neutral-500 text-xs">Roll #{{ store.rollNumber }}</span>

        <!-- Rapid play toggle -->
        <button
          class="text-[10px] px-2 py-0.5 rounded border transition-colors"
          :class="rapidPlay
            ? 'border-amber-500 text-amber-400 bg-amber-500/10'
            : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'"
          title="Rapid Play: skip dice animation for faster rolls"
          @click="rapidPlay = !rapidPlay"
        >
          {{ rapidPlay ? 'RAPID ⚡' : 'Normal' }}
        </button>

        <!-- Auto-roll toggle -->
        <button
          class="text-[10px] px-2 py-0.5 rounded border transition-colors"
          :class="autoRoll
            ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
            : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'"
          :title="autoRoll ? 'Auto-roll ON — click to stop' : 'Auto-roll: automatically roll dice on a timer'"
          @click="autoRoll = !autoRoll; if (autoRoll && canRoll) startAutoRollTimer()"
        >
          {{ autoRoll ? 'AUTO ●' : 'Auto' }}
        </button>

        <!-- Auto-roll speed selector -->
        <select
          v-if="autoRoll"
          v-model.number="autoRollSpeed"
          class="text-[10px] bg-neutral-800 text-neutral-400 border border-neutral-700 rounded px-1 py-0.5"
          title="Time between auto-rolls"
        >
          <option :value="1000">
            1s
          </option>
          <option :value="2000">
            2s
          </option>
          <option :value="3000">
            3s
          </option>
          <option :value="5000">
            5s
          </option>
        </select>

        <!-- Study mode toggle -->
        <button
          class="text-[10px] px-2 py-0.5 rounded border transition-colors"
          :class="studyMode
            ? 'border-blue-500 text-blue-400 bg-blue-500/10'
            : 'border-neutral-700 text-neutral-500 hover:text-neutral-300'"
          :title="studyMode ? 'Study Mode ON — hover zones for explanations. Click to exit.' : 'Study Mode: pause game and explore every bet on the table'"
          @click="studyMode = !studyMode"
        >
          {{ studyMode ? 'STUDY' : 'Study' }}
        </button>

        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          :icon="showSidebar ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
          title="Toggle stats/advisor panel"
          @click="showSidebar = !showSidebar"
        />
        <UButton
          size="xs"
          variant="outline"
          color="error"
          label="New Game"
          icon="i-lucide-log-out"
          @click="requestNewGame"
        />
      </div>
    </header>

    <!-- Main content: table + sidebar -->
    <div class="flex-1 flex overflow-hidden min-h-0">
      <!-- Left: table area -->
      <div class="flex-1 flex flex-col min-w-0 min-h-0">
        <!-- Stickman call -->
        <div class="h-10 flex items-center justify-center shrink-0">
          <TableStickmanCall />
        </div>

        <!-- Craps table + payout floaters -->
        <div class="table-area flex-1 flex items-center justify-center px-2 relative min-h-0">
          <div class="table-wrapper relative">
            <TableCrapsTable
              :active-bets="store.activeBets"
              :disabled-zones="takeDownMode ? EMPTY_SET : disabledZones"
              :puck-state="store.puckState"
              :puck-point="store.point"
              :study-mode="studyMode"
              :game-phase="store.phase"
              @zone-click="handleZoneClick"
            />
            <!-- Payout floating text -->
            <div
              v-for="floater in payoutFloaters"
              :key="floater.id"
              class="absolute text-lg font-bold pointer-events-none payout-float"
              :class="{
                'text-emerald-400': floater.type === 'win',
                'text-red-400': floater.type === 'lose',
                'text-neutral-400': floater.type === 'push'
              }"
              :style="{ left: floater.x + 'px', top: '40%' }"
            >
              {{ floater.text }}
            </div>
          </div>
        </div>

        <!-- Auto-roll countdown bar -->
        <div
          v-if="autoRoll && autoRollCountdown > 0"
          class="h-1 bg-neutral-800 shrink-0"
        >
          <div
            class="h-full bg-emerald-500 transition-all duration-100"
            :style="{ width: ((autoRollCountdown / autoRollSpeed) * 100) + '%' }"
          />
        </div>

        <!-- Dice display -->
        <div class="flex items-center justify-center shrink-0">
          <TableDicePair
            :die1="displayDie1"
            :die2="displayDie2"
            :rolling="diceRolling && !rapidPlay"
          />
        </div>

        <!-- Control bar -->
        <div class="border-t border-neutral-800 bg-neutral-900/60 shrink-0">
          <TableControlBar
            :can-roll="canRoll"
            :roll-blocked-reason="rollBlockedReason"
            :take-down-mode="takeDownMode"
            :has-same-bet="lastBetConfig.length > 0"
            :hero-is-shooting="heroIsShooting"
            @roll="handleRoll"
            @toggle-take-down="takeDownMode = !takeDownMode"
            @same-bet="placeSameBet"
          />
        </div>

        <!-- Chip tray -->
        <div class="border-t border-neutral-800 bg-neutral-900/80 shrink-0">
          <TableChipTray />
        </div>
      </div>

      <!-- Right: stats/advisor sidebar -->
      <aside
        class="border-l border-neutral-800 shrink-0 transition-all duration-200 overflow-hidden min-h-0
               fixed inset-y-0 right-0 z-30 w-80 max-w-[85vw] bg-neutral-950
               lg:static lg:z-auto lg:bg-transparent lg:w-80"
        :class="showSidebar ? 'translate-x-0 lg:max-w-80' : 'translate-x-full lg:translate-x-0 lg:max-w-0 lg:border-l-0'"
      >
        <StatsAdvisorPanel @advisor-bet="handleAdvisorBet" />
      </aside>
    </div>

    <!-- New Game confirmation modal -->
    <UModal
      v-model:open="showNewGameConfirm"
      title="Leave Table?"
      description="Your current session will be lost. Are you sure you want to start a new game?"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p class="text-neutral-400 text-sm">
          This will end your current session and return to the setup screen.
        </p>
      </template>
      <template #footer>
        <UButton
          variant="outline"
          color="neutral"
          label="Cancel"
          @click="showNewGameConfirm = false"
        />
        <UButton
          color="error"
          label="Leave Table"
          @click="confirmNewGame"
        />
      </template>
    </UModal>

    <!-- Hop bet target picker -->
    <UModal
      v-model:open="hopPicker.open"
      :title="hopPicker.type === 'hopHard' ? 'Hop Hard — pick the pair total' : 'Hop Easy — pick the total'"
      description="One-roll bet on the next roll landing your number the chosen way."
    >
      <template #body>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="t in hopTargets"
            :key="t"
            :label="String(t)"
            color="primary"
            variant="soft"
            size="lg"
            @click="placeHopBet(t)"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
@keyframes float-up {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-60px); }
}
.payout-float {
  animation: float-up 1.5s ease-out forwards;
}

/* Table area: the SVG must fit entirely within this box (no clipping) */
.table-area {
  overflow: visible;
}

.table-wrapper {
  max-width: 1100px;
  width: 100%;
  max-height: 100%;
  /* Aspect ratio matches the SVG viewBox (1240:640 with padding) */
  aspect-ratio: 1240 / 640;
}

.table-page :deep(.craps-table) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
