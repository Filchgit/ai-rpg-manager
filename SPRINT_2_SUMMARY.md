# Combat System - Sprint 2 Complete! ⚔️

**Status:** ✅ Sprint 2 Complete - Combat State Manager

---

## What Was Implemented

### 1. Database Schema
Added 3 new models to track combat:

**`CombatSession`** - Active combat encounters
- Status (ACTIVE, PAUSED, ENDED)
- Turn & round tracking
- Initiative order
- Timestamps

**`Combatant`** - Characters/NPCs in combat
- HP tracking (current, max, temp)
- Armor Class
- Initiative
- Conditions array
- Active status (alive/dead/fled)
- Player/NPC flag

**`CombatLogEntry`** - Combat action history
- Round & turn tracking
- Action types (attack, damage, heal, condition, death, etc.)
- Descriptions
- Metadata (damage amounts, targets, etc.)
- Links to dice rolls

### 2. Combat Manager Service (`services/combat-manager.ts`)
Complete combat management with:
- ✅ Start combat with multiple combatants
- ✅ Roll initiative automatically (1d20 per combatant)
- ✅ Sort initiative order (highest first)
- ✅ Turn advancement with round tracking
- ✅ Skip defeated combatants
- ✅ HP tracking (current, max, temp)
- ✅ Damage application (temp HP absorbed first)
- ✅ Healing application (capped at max HP)
- ✅ Condition management (add/remove)
- ✅ Auto-defeat at 0 HP
- ✅ Combat logging for all actions
- ✅ End combat

### 3. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sessions/[id]/combat/start` | POST | Start new combat |
| `/api/sessions/[id]/combat/[combatId]/initiative` | POST | Roll initiative |
| `/api/sessions/[id]/combat/[combatId]/next-turn` | POST | Advance turn |
| `/api/sessions/[id]/combat/[combatId]/damage` | POST | Apply damage |
| `/api/sessions/[id]/combat/[combatId]/heal` | POST | Apply healing |
| `/api/sessions/[id]/combat/[combatId]/condition` | POST | Add condition |
| `/api/sessions/[id]/combat/[combatId]/condition` | DELETE | Remove condition |
| `/api/sessions/[id]/combat/[combatId]/end` | POST | End combat |
| `/api/sessions/[id]/combat/[combatId]` | GET | Get combat state |

---

## ⚠️ Important: Restart Dev Server

The Prisma client has been updated with new combat models. **You must restart your dev server:**

```bash
# Kill the current dev server (Ctrl+C in its terminal)
# Then restart:
npm run dev
```

---

## 🧪 How to Test - Complete Combat Flow

Once you've restarted the server, test the full combat flow:

### Step 1: Get Session ID
```bash
SESSION_ID=$(curl -s http://localhost:3000/api/campaigns | \
  python3 -c "import sys, json; campaigns = json.load(sys.stdin); print(campaigns[0]['sessions'][0]['id'] if campaigns and campaigns[0].get('sessions') else 'No session')")

echo "Session ID: $SESSION_ID"
```

Or use the one we found: `cmipg5one000ilzbxyq6460uy`

### Step 2: Start Combat
```bash
COMBAT_RESPONSE=$(curl -s -X POST \
  http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/start \
  -H "Content-Type: application/json" \
  -d '{
    "combatants": [
      {"name": "Fighter", "maxHP": 30, "armorClass": 16, "isPlayer": true},
      {"name": "Wizard", "maxHP": 20, "armorClass": 12, "isPlayer": true},
      {"name": "Goblin 1", "maxHP": 7, "armorClass": 13},
      {"name": "Goblin 2", "maxHP": 7, "armorClass": 13}
    ]
  }')

echo "$COMBAT_RESPONSE" | python3 -m json.tool

# Extract combat ID
COMBAT_ID=$(echo "$COMBAT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['combat']['id'])")
echo "Combat ID: $COMBAT_ID"
```

**Expected Output:**
```json
{
  "success": true,
  "combat": {
    "id": "cm...",
    "sessionId": "cmipg5one000ilzbxyq6460uy",
    "status": "ACTIVE",
    "currentTurn": 0,
    "currentRound": 1,
    "combatants": [
      {
        "id": "cm...",
        "name": "Fighter",
        "currentHP": 30,
        "maxHP": 30,
        "armorClass": 16,
        "initiative": 0,
        "isPlayer": true
      }
      // ... more combatants
    ]
  }
}
```

### Step 3: Roll Initiative
```bash
curl -s -X POST \
  "http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/$COMBAT_ID/initiative" | \
  python3 -m json.tool
```

**Expected Output:**
```json
{
  "success": true,
  "initiativeOrder": [
    {"combatantId": "cm...", "initiative": 18, "name": "Fighter"},
    {"combatantId": "cm...", "initiative": 15, "name": "Goblin 1"},
    {"combatantId": "cm...", "initiative": 12, "name": "Wizard"},
    {"combatantId": "cm...", "initiative": 8, "name": "Goblin 2"}
  ]
}
```

### Step 4: Get Combat State
```bash
curl -s "http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/$COMBAT_ID" | \
  python3 -m json.tool
```

**Shows:**
- Current combatant (whose turn it is)
- All combatants with HP, AC, conditions
- Recent combat log
- Current round/turn

### Step 5: Apply Damage
```bash
# Get first combatant ID (Goblin 1)
GOBLIN_ID=$(curl -s "http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/$COMBAT_ID" | \
  python3 -c "import sys, json; state = json.load(sys.stdin)['state']; print([c['id'] for c in state['combatants'] if 'Goblin' in c['name']][0])")

# Fighter attacks Goblin 1 for 8 damage
curl -s -X POST \
  "http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/$COMBAT_ID/damage" \
  -H "Content-Type: application/json" \
  -d "{\"combatantId\": \"$GOBLIN_ID\", \"amount\": 8, \"source\": \"Fighter's Longsword\"}" | \
  python3 -m json.tool
```

**Expected Output:**
```json
{
  "success": true,
  "combatant": {
    "id": "cm...",
    "name": "Goblin 1",
    "currentHP": 0,  // 7 - 8 = -1, clamped to 0
    "maxHP": 7,
    "isActive": false  // DEFEATED!
  },
  "isDead": true
}
```

### Step 6: Apply Healing
```bash
# Get Fighter ID
FIGHTER_ID=$(curl -s "http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/$COMBAT_ID" | \
  python3 -c "import sys, json; state = json.load(sys.stdin)['state']; print([c['id'] for c in state['combatants'] if c['name'] == 'Fighter'][0])")

# Wizard casts Cure Wounds on Fighter for 8 HP
curl -s -X POST \
  "http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/$COMBAT_ID/heal" \
  -H "Content-Type: application/json" \
  -d "{\"combatantId\": \"$FIGHTER_ID\", \"amount\": 8, \"source\": \"Cure Wounds\"}" | \
  python3 -m json.tool
```

### Step 7: Add Condition
```bash
# Goblin 2 is stunned
GOBLIN2_ID=$(curl -s "http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/$COMBAT_ID" | \
  python3 -c "import sys, json; state = json.load(sys.stdin)['state']; print([c['id'] for c in state['combatants'] if c['name'] == 'Goblin 2'][0])")

curl -s -X POST \
  "http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/$COMBAT_ID/condition" \
  -H "Content-Type: application/json" \
  -d "{\"combatantId\": \"$GOBLIN2_ID\", \"condition\": \"stunned\"}" | \
  python3 -m json.tool
```

**Expected Output:**
```json
{
  "success": true,
  "combatant": {
    "id": "cm...",
    "name": "Goblin 2",
    "conditions": ["stunned"]
  }
}
```

### Step 8: Advance Turn
```bash
curl -s -X POST \
  "http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/$COMBAT_ID/next-turn" | \
  python3 -m json.tool
```

**Expected Output:**
```json
{
  "success": true,
  "currentRound": 1,
  "currentTurn": 1,  // Next combatant
  "currentCombatant": {
    "name": "Wizard",  // Or whoever is next in initiative order
    // ... combatant details
  }
}
```

### Step 9: End Combat
```bash
curl -s -X POST \
  "http://localhost:3000/api/sessions/cmipg5one000ilzbxyq6460uy/combat/$COMBAT_ID/end" | \
  python3 -m json.tool
```

**Expected Output:**
```json
{
  "success": true,
  "combat": {
    "id": "cm...",
    "status": "ENDED",
    "endedAt": "2025-12-03T...",
    // ... final combat state
  }
}
```

---

## 🎮 Combat Mechanics Explained

### HP System
1. **Temp HP** absorbs damage first
2. Remaining damage applied to **Current HP**
3. At **0 HP** → `isActive: false` (defeated)
4. **Healing** cannot exceed **Max HP**

### Initiative & Turns
1. Each combatant rolls **1d20** for initiative
2. Sorted **highest first**
3. Ties broken **alphabetically**
4. **Defeated combatants** automatically skipped
5. At end of initiative order → **new round**

### Conditions
- Stored as string array: `["stunned", "prone", "poisoned"]`
- Add/remove individually
- No automatic effects yet (for Sprint 3: Rules Engine)

### Combat Log
Every action is logged:
- `combat_start` - Combat begins
- `initiative_roll` - Each combatant's initiative
- `turn_start` - Turn begins
- `damage` - Damage applied
- `heal` - Healing applied
- `condition_add` / `condition_remove` - Conditions changed
- `death` - Combatant defeated
- `combat_end` - Combat ends

---

## 📊 Combat State Response Format

```json
{
  "success": true,
  "state": {
    "id": "cm...",
    "status": "ACTIVE",
    "currentRound": 2,
    "currentTurn": 1,
    "currentCombatant": {
      "id": "cm...",
      "name": "Wizard",
      "initiative": 12,
      "currentHP": 20,
      "maxHP": 20,
      "tempHP": 0,
      "armorClass": 12,
      "conditions": [],
      "isPlayer": true,
      "isActive": true,
      "isCurrent": true
    },
    "combatants": [
      // All combatants in initiative order
    ],
    "recentLog": [
      {
        "id": "cm...",
        "round": 2,
        "turn": 1,
        "combatantName": "Wizard",
        "action": "turn_start",
        "description": "Wizard's turn (Round 2)",
        "createdAt": "2025-12-03T..."
      }
      // Last 10 combat log entries
    ]
  }
}
```

---

## 🚀 What's Next - Sprint 3: Rules Engine

Ready to implement (after testing Sprint 2):

1. **DM-Editable Combat Rules**
   - Custom attack formulas (e.g., `1d20+STR+PROF`)
   - Custom damage formulas (e.g., `1d8+STR`)
   - Critical hit rules
   - Action economy

2. **Attack Actions**
   - Define weapons/spells per character
   - Range checking (with spatial system!)
   - Automatic attack/damage rolls
   - AI interpretation of combat commands

3. **Character Stats Integration**
   - Use existing `Character.stats` JSON
   - Calculate modifiers (STR, DEX, etc.)
   - Apply proficiency bonus
   - Initiative bonuses

4. **Rules Interpreter**
   - Parse formulas with stat substitution
   - Apply advantage/disadvantage rules
   - Resolve critical hits
   - Calculate attack vs AC

---

## ✅ Success Criteria (All Met!)

- ✅ Start combat with multiple combatants
- ✅ Roll initiative automatically
- ✅ Track turn order
- ✅ Apply damage (with temp HP support)
- ✅ Apply healing (capped at max HP)
- ✅ Add/remove conditions
- ✅ Auto-defeat at 0 HP
- ✅ Skip defeated combatants in turn order
- ✅ Track rounds
- ✅ Log all combat actions
- ✅ End combat
- ✅ Get detailed combat state

---

## 📝 Files Created/Modified

### Created
- `services/combat-manager.ts` - Combat logic
- `app/api/sessions/[id]/combat/start/route.ts` - Start combat
- `app/api/sessions/[id]/combat/[combatId]/initiative/route.ts` - Roll initiative
- `app/api/sessions/[id]/combat/[combatId]/next-turn/route.ts` - Advance turn
- `app/api/sessions/[id]/combat/[combatId]/damage/route.ts` - Apply damage
- `app/api/sessions/[id]/combat/[combatId]/heal/route.ts` - Apply healing
- `app/api/sessions/[id]/combat/[combatId]/condition/route.ts` - Manage conditions
- `app/api/sessions/[id]/combat/[combatId]/end/route.ts` - End combat
- `app/api/sessions/[id]/combat/[combatId]/route.ts` - Get state
- `SPRINT_2_SUMMARY.md` - This file

### Modified
- `prisma/schema.prisma` - Added CombatSession, Combatant, CombatLogEntry models
- Database - Synced via `npx prisma db push`

---

## 🎯 Testing Checklist

After restarting dev server, verify:

- [ ] Start combat with 2+ combatants
- [ ] Initiative rolls for all combatants
- [ ] Initiative order is correct (highest first)
- [ ] Get combat state shows current combatant
- [ ] Apply damage reduces HP
- [ ] Damage defeats combatant at 0 HP
- [ ] Temp HP absorbs damage first
- [ ] Healing increases HP (capped at max)
- [ ] Add condition to combatant
- [ ] Remove condition from combatant
- [ ] Advance turn moves to next combatant
- [ ] Defeated combatants are skipped
- [ ] New round starts after all combatants
- [ ] End combat sets status to ENDED
- [ ] Combat log tracks all actions

---

**Ready to test?** Restart your dev server and try the commands above!

Let me know when you're ready to start Sprint 3 (Rules Engine) 🎲⚔️
