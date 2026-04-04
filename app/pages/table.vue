<script setup lang="ts">
import type { BetType } from '~/utils/betTypes'
import { BET_TYPE_TO_ZONE } from '~/utils/betTypes'
import { crapsConfig } from '~~/craps.config'

const store = useCrapsStore()
const router = useRouter()
const { placeBet, validateBet } = useBetManager()
const { executeRoll } = useGameLoop()

// Reverse mapping: zone ID -> BetType
const ZONE_TO_BET_TYPE: Record<string, BetType> = {} as Record<string, BetType>
for (const [betType, zoneId] of Object.entries(BET_TYPE_TO_ZONE)) {
  ZONE_TO_BET_TYPE[zoneId] = betType as BetType
}

// On mount: check if game is initialized, try loading from storage
onMounted(() => {
  if (store.phase === 'SETUP') {
    const loaded = store.loadFromLocalStorage()
    if (!loaded) {
      router.replace('/')
      return
    }
  }
})

// Dice animation state
const diceRolling = ref(false)

// Compute which zones are disabled (can't place a bet there right now)
const disabledZones = computed(() => {
  const disabled: string[] = []
  for (const [zoneId, betType] of Object.entries(ZONE_TO_BET_TYPE)) {
    const validation = validateBet(betType, store.selectedChipValue, 'hero', {
      phase: store.phase,
      point: store.point,
      activeBets: store.activeBets,
      tableRules: store.tableRules,
      rollNumber: store.rollNumber,
      dontBetRemovedThisCycle: store.dontBetRemovedThisCycle
    })
    if (!validation.valid) {
      disabled.push(zoneId)
    }
  }
  return disabled
})

function handleZoneClick(zoneId: string) {
  const betType = ZONE_TO_BET_TYPE[zoneId]
  if (!betType) return
  placeBet(betType, store.selectedChipValue, 'hero')
}

// Hero must have a Pass or Don't Pass bet to roll (MBS 3.7)
const heroHasLineBet = computed(() => {
  return store.activeBets.some(
    b => b.owner === 'hero' && b.status !== 'resolved' && (b.type === 'pass' || b.type === 'dontPass')
  )
})

const canRoll = computed(() => {
  return !diceRolling.value
    && ['COME_OUT', 'POINT_PHASE'].includes(store.phase)
    && heroHasLineBet.value
})

const rollBlockedReason = computed(() => {
  if (diceRolling.value) return 'Rolling...'
  if (!['COME_OUT', 'POINT_PHASE'].includes(store.phase)) return 'Waiting for next phase'
  if (!heroHasLineBet.value) return 'Place a Pass Line or Don\'t Pass bet first (MBS Rule 3.7)'
  return ''
})

function handleRoll() {
  if (!canRoll.value) return

  // 1. Pre-roll the dice
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  pendingDie1.value = d1
  pendingDie2.value = d2

  // 2. Start animation
  diceRolling.value = true

  // 3. After animation, resolve and unlock
  setTimeout(() => {
    try {
      executeRoll(d1, d2)
    } finally {
      pendingDie1.value = null
      pendingDie2.value = null
      diceRolling.value = false
      store.animating = false
    }
  }, 800)
}

const pendingDie1 = ref<number | null>(null)
const pendingDie2 = ref<number | null>(null)
const displayDie1 = computed(() => pendingDie1.value ?? store.currentRoll?.die1 ?? null)
const displayDie2 = computed(() => pendingDie2.value ?? store.currentRoll?.die2 ?? null)

// New game with confirmation
const showNewGameConfirm = ref(false)

function requestNewGame() {
  showNewGameConfirm.value = true
}

function confirmNewGame() {
  store.clearSession()
  router.push('/')
}

function cancelNewGame() {
  showNewGameConfirm.value = false
}

// Sidebar toggle for mobile
const showSidebar = ref(true)

const hero = computed(() => store.hero)
</script>

<template>
  <div class="table-page min-h-screen bg-neutral-950 flex flex-col">
    <!-- Top bar -->
    <header class="flex items-center justify-between px-4 py-2 bg-neutral-900/80 border-b border-neutral-800">
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
      </div>
      <div class="flex items-center gap-2">
        <span class="text-neutral-500 text-xs">
          Roll #{{ store.rollNumber }}
        </span>
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
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: table area -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Stickman call -->
        <div class="h-10 flex items-center justify-center shrink-0">
          <TableStickmanCall />
        </div>

        <!-- Craps table SVG -->
        <div class="flex-1 flex items-center justify-center px-2 overflow-hidden">
          <div class="w-full max-w-[1100px]">
            <TableCrapsTable
              :active-bets="store.activeBets"
              :disabled-zones="disabledZones"
              :puck-state="store.puckState"
              :puck-point="store.point"
              @zone-click="handleZoneClick"
            />
          </div>
        </div>

        <!-- Dice display -->
        <div class="flex items-center justify-center py-1 shrink-0">
          <TableDicePair
            :die1="displayDie1"
            :die2="displayDie2"
            :rolling="diceRolling"
          />
        </div>

        <!-- Control bar -->
        <div class="border-t border-neutral-800 bg-neutral-900/60 shrink-0">
          <TableControlBar
            :can-roll="canRoll"
            :roll-blocked-reason="rollBlockedReason"
            @roll="handleRoll"
          />
        </div>

        <!-- Chip tray -->
        <div class="border-t border-neutral-800 bg-neutral-900/80 shrink-0">
          <TableChipTray />
        </div>
      </div>

      <!-- Right: stats/advisor sidebar -->
      <aside
        class="w-80 border-l border-neutral-800 shrink-0 transition-all duration-200 overflow-hidden"
        :class="showSidebar ? 'max-w-80' : 'max-w-0 border-l-0'"
      >
        <StatsAdvisorPanel />
      </aside>
    </div>

    <!-- New Game confirmation dialog -->
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
  </div>
</template>
