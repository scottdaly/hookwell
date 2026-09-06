# Hookwell

*A chartered city of wizards, where magic is municipal plumbing.*

A city builder in which a turquoise fluid called **ley** rises from a spring, runs in open gutters
cut into the streets, powers the town's lamps, ovens, scriptoria and stills, and blooms into
cobalt fungus wherever it is allowed to pool. You lay out a settlement of candle-thin houses
with tented cobalt roofs, earn wax-sealed charters, and watch a strange small city emerge.

## Run it

```
npm install
npm run dev          # then open http://localhost:5177
```

Desktop window (Electron):

```
npm run desktop      # builds to dist/ and opens Hookwell in its own window
npm run desktop:dev  # Electron pointed at the running dev server
```

Controls: left click places the selected thing (drag to paint streets and channels); right click
or `Esc` cancels; right-drag or `WASD` pans; middle-drag or `Q`/`E` rotates; scroll zooms;
`Space` pauses; `1` `2` `3` set speed.

## The loop

1. **Lay streets** from the old road at the west edge. Every building must touch a street.
2. **Homes, bread, timber, stone.** Apprentice lodgings fill at dawn when there is bread.
   A woodcutter needs candle-pines within three tiles; a stonecutter must touch rock.
3. **A well** gives company. Five people and a well seal the *Charter of Channels*.
4. **Cut ley channels** into streets from the spring. Buildings beside a live channel are
   supplied. Lamps stand on channels and light the homes around them.
5. **Ley must circulate.** A channel that dead-ends pools, and bloom rises on the tiles around
   it, warping nearby buildings. Close the loop, cap the end with a cistern, or ward it.
6. **Ink** is written in scriptoria and distilled in still-houses. Ink and population unlock the
   later charters: journeymen, the Chancery, wards, masters' towers, the observatory.
7. The *City Charter* is sealed when three masters live in towers.

Scripted inspection tools:

```
node tools/shoot.mjs             # every canonical view into shots/
node tools/shoot.mjs mature-noon # one view
node tools/playtest.mjs          # a scripted player runs the whole loop and prints the pace
```

See `CREATIVE_CONSTITUTION.md` for the world's rules and `shots/canon/` for the reference views.
