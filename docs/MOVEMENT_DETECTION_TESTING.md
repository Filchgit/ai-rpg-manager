# Movement Detection Testing Guide

This guide explains how to test the Phase 2 AI Movement Detection system.

## Overview

The AI now detects when players want to move their characters and automatically suggests appropriate positions based on their intended action (attacking, investigating, talking, etc.).

## How It Works

1. **Player sends message** with movement intent (e.g., "I approach the orc to attack")
2. **AI detects movement** using natural language understanding
3. **AI calculates position** based on action type and movement rules
4. **AI returns suggestion** in response metadata
5. **Frontend displays confirmation** (to be implemented in Phase 4)
6. **Player confirms/adjusts** the movement
7. **Position is updated** in database

## Testing Locally

### Prerequisites

- Dev server running (`npm run dev`)
- Database with spatial system set up
- At least one campaign, session, and character with position

### Step 1: Create a Session with Spatial Data

```bash
# 1. Create a campaign (if you don't have one)
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Movement Test Campaign",
    "description": "Testing movement detection"
  }'

# Save the campaign ID from response

# 2. Create a location from template
curl -X POST http://localhost:3000/api/campaigns/YOUR_CAMPAIGN_ID/locations \
  -H "Content-Type: application/json" \
  -d '{"template": "tavern"}'

# Save the location ID

# 3. Create a character
curl -X POST http://localhost:3000/api/characters \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "YOUR_CAMPAIGN_ID",
    "name": "Test Hero",
    "class": "Fighter",
    "level": 5
  }'

# Save the character ID

# 4. Set character position
curl -X PUT http://localhost:3000/api/characters/YOUR_CHARACTER_ID/position \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "YOUR_LOCATION_ID",
    "x": 5,
    "y": 5,
    "z": 0
  }'

# 5. Add an NPC orc to the location (as a feature for now)
curl -X POST http://localhost:3000/api/campaigns/YOUR_CAMPAIGN_ID/locations/YOUR_LOCATION_ID/features \
  -H "Content-Type: application/json" \
  -d '{
    "type": "POI",
    "name": "Orc Warrior",
    "description": "A menacing orc with a battle axe",
    "x": 12,
    "y": 8,
    "z": 0,
    "width": 1,
    "height": 2,
    "depth": 1
  }'

# 6. Create a session
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "YOUR_CAMPAIGN_ID",
    "name": "Movement Test Session"
  }'

# Save the session ID
```

### Step 2: Test Movement Detection

Send messages to the AI and check if movement is detected:

```bash
# Test 1: Attack movement (should suggest moving close for melee)
curl -X POST http://localhost:3000/api/sessions/YOUR_SESSION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I draw my sword and charge at the orc!"
  }'

# Expected response should include:
# - metadata.movementSuggestion with:
#   * detected: true
#   * actionType: "MELEE"
#   * targetName: "orc"
#   * targetPosition: approximately 1.5m from orc position
#   * reason: "To attack the orc"
```

```bash
# Test 2: Investigation movement (should move close to examine)
curl -X POST http://localhost:3000/api/sessions/YOUR_SESSION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I want to investigate the bar counter"
  }'

# Expected: movement suggestion to bar counter location
```

```bash
# Test 3: No movement (should not suggest anything)
curl -X POST http://localhost:3000/api/sessions/YOUR_SESSION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I look around the room carefully"
  }'

# Expected: no movement suggestion in metadata
```

```bash
# Test 4: Conversation movement (should move to conversation range)
curl -X POST http://localhost:3000/api/sessions/YOUR_SESSION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I approach the orc to talk with him"
  }'

# Expected: movement suggestion to ~2-6 meters from orc
```

### Step 3: Test Movement API Endpoints

#### Suggest Movement (Calculate without applying)

```bash
curl -X POST "http://localhost:3000/api/sessions/YOUR_SESSION_ID/movement?action=suggest" \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "YOUR_CHARACTER_ID",
    "targetPosition": {"x": 10, "y": 8, "z": 0},
    "actionType": "MELEE",
    "targetName": "orc",
    "reason": "To attack"
  }'

# Expected: Movement suggestion with validation status
```

#### Apply Movement (Update database)

```bash
curl -X POST "http://localhost:3000/api/sessions/YOUR_SESSION_ID/movement?action=apply" \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "YOUR_CHARACTER_ID",
    "targetPosition": {"x": 10, "y": 8, "z": 0},
    "reason": "To attack the orc"
  }'

# Expected: Success response, character position updated in database
```

#### Verify Position Update

```bash
curl http://localhost:3000/api/characters/YOUR_CHARACTER_ID/position

# Should show new position (10, 8, 0)
```

#### Check Movement History

```bash
# Movement events are stored in session state
curl http://localhost:3000/api/sessions/YOUR_SESSION_ID

# Check state.recentEvents for movement history
```

## Movement Keywords Detected

The AI recognizes these patterns:

### Attack/Combat
- "charge at"
- "rush at"
- "attack"
- "strike"
- "engage"
- "fight"

### Approach
- "approach"
- "move to"
- "walk to"
- "go to"
- "head to"

### Flee
- "flee"
- "run away"
- "retreat"
- "back away"
- "step back"

### Investigate
- "investigate"
- "examine"
- "inspect"
- "look at"
- "check out"
- "search"

### Talk/Social
- "talk to"
- "speak to"
- "approach to talk"
- "converse with"

## Expected Distances by Action Type

| Action Type | Distance from Target |
|-------------|---------------------|
| MELEE       | 1.5 meters (~5 feet) |
| RANGED      | 10-18 meters        |
| SPELL       | 5-9 meters          |
| CONVERSATION| 2-6 meters          |
| PERCEPTION  | Close to feature    |
| MOVEMENT    | Variable            |

## Validation Checks

The system validates:

1. **Bounds Check**: Target position is within location boundaries
2. **Obstacle Check**: Path doesn't intersect blocking features
3. **Distance Check**: Movement isn't unreasonably far (< 50 meters)
4. **Feature Collision**: Target position doesn't overlap obstacles

## Testing with Prisma Studio

1. Open Prisma Studio: `npx prisma studio`
2. Navigate to **CharacterPosition** table
3. Send movement messages via API
4. Refresh Prisma Studio to see position updates
5. Check **SessionState** → **recentEvents** for movement history

## Debugging

### Enable Detailed Logging

Check your dev server terminal for logs:
- `Movement suggestion detected: ...`
- `Validating movement: ...`
- `Movement applied: ...`

### Common Issues

**Movement not detected:**
- Check if spatial context is being built (character has position)
- Verify location exists and is set in session state
- Ensure keywords are present in user input

**Movement validation fails:**
- Check location bounds in database
- Verify target position is within bounds
- Check for blocking features in path

**AI not returning JSON:**
- Verify `response_format: { type: 'json_object' }` is set
- Check OpenAI API model supports JSON mode (gpt-4o-mini does)
- Review system prompt includes JSON structure instructions

## Next Steps

- **Phase 3**: Pathfinding around obstacles, elevation effects
- **Phase 4**: UI components for visual movement confirmation
- **Phase 5**: Testing and optimization

## Example Full Test Scenario

```bash
# 1. Character starts at (5, 5, 0)
# 2. Orc is at (12, 8, 0)
# 3. Player: "I charge at the orc with my sword!"
# 4. AI detects movement, suggests position at (10.5, 7.2, 0) - approximately 1.5m from orc
# 5. Player confirms via frontend (not yet implemented)
# 6. Position updated to (10.5, 7.2, 0)
# 7. Movement recorded in session history
# 8. Next AI response references new position: "You rush forward and are now face-to-face with the orc..."
```

## Manual Testing Checklist

- [ ] Create campaign with location and characters
- [ ] Test detection of attack movement
- [ ] Test detection of investigation movement
- [ ] Test detection of conversation movement
- [ ] Test no detection when no movement keywords
- [ ] Test movement API suggest endpoint
- [ ] Test movement API apply endpoint
- [ ] Verify position updates in database
- [ ] Check movement history in session state
- [ ] Test validation (out of bounds)
- [ ] Test validation (blocked by obstacle)
- [ ] Verify AI narrative references new positions

## Automated Testing (TODO)

Future work:
- Unit tests for MovementDetectorService
- Integration tests for movement API
- E2E tests for full movement flow

