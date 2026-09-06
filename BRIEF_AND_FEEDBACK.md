# Hookwell — the brief and every message from Scott

Verbatim record of the messages Scott sent during the session that built Hookwell
(6 September 2026). Claude's replies, code and screenshots are in the git history and `shots/`.

---

## 1. The brief

> I want you to build me a wizard city builder.
>
> Make it a real, playable desktop game, not a graphics demo or a single pretty scene. I should be able to start with very little, lay out a settlement, build homes and useful places, attract inhabitants, solve problems, unlock new possibilities, and watch a strange magical city gradually emerge.
>
> Be ambitious, but prioritize a polished vertical slice I can actually play.
>
> Before designing or implementing the game, follow this procedure:
>
> Generate a long random alphanumeric string using a shell command.
> Study it for creative provocation: repetition, clusters, gaps, rhythms, numbers, asymmetries, contrasts, apparent structures, or anything else that sparks an association.
> Use those provocations to develop a coherent creative point of view for this particular city and game.
> Decide strong principles for the world, architecture, materials, scale, inhabitants, magic, interface, progression, pacing, and what the game deliberately refuses to be.
> Save the resulting principles to CREATIVE_CONSTITUTION.md.
>
> Do not reveal or save the random string itself. It is only there to push you away from your most obvious first answer. Use your own judgment after that.
>
> The game
>
> The fantasy is building an actual wizard city, not managing one hero academy or looking at one decorative diorama.
>
> The player should have to make spatial decisions:
>
> place roads, paths or other circulation;
> place individual buildings;
> provide homes and work;
> support the needs of inhabitants;
> manage at least a small set of resources or city systems;
> unlock more sophisticated buildings, services or forms of magic over time;
> respond to consequences created by the layout and choices they made.
>
> You have broad freedom to invent the actual systems. Magic should affect how the city works rather than existing only as fantasy decoration or a renamed currency.
>
> Aim for roughly 10–15 minutes of meaningful progression in the current build, with enough systems that I can see the beginnings of a larger game.
>
> The world must force you to develop a visual language
>
> This is extremely important.
>
> Do not solve the brief as one beautiful central building surrounded by scenery. Do not make a single floating-island vignette and call it a city.
>
> Even the vertical slice should contain enough ordinary things that the world has to develop its own design language:
>
> several kinds of ordinary wizard homes;
> shops/workplaces;
> civic or magical infrastructure;
> at least one landmark;
> roads or paths;
> trees/vegetation;
> street furniture and mundane props;
> inhabitants;
> small utility/service objects;
> spaces between buildings.
>
> I want to be able to look at an unimportant little house, shed, lamp, fence, tree or shop and think: yes, that belongs specifically to this city.
>
> Ordinary objects matter as much as hero buildings.
>
> Architecture should vary according to purpose while clearly belonging to one world. Avoid producing ten recolors of the same generic building.
>
> Visual quality
>
> Make the game striking, beautiful, charming and opinionated.
>
> Do not settle for the easiest contemporary "pretty stylized 3D" look.
>
> In particular, be suspicious if visual quality is coming mostly from:
>
> dramatic night lighting;
> bloom and emissive windows;
> soft low-poly foliage;
> flat colored base meshes;
> a single picturesque camera composition.
>
> Those techniques are allowed, but they cannot carry the identity of the game.
>
> Silhouette, proportion, architecture, surface treatment, materials, color relationships, object design and environmental storytelling must hold up on their own.
>
> Regularly inspect the city under neutral daytime lighting as well as whatever atmospheric conditions you choose. If it only looks good at night with glowing windows, it is not finished.
>
> Surfaces should feel authored rather than like raw base meshes. Stone, plaster, wood, metal, roofs, roads, vegetation and magical materials should have enough visual character to read at normal gameplay scale.
>
> Do not indiscriminately add visual noise. Develop a deliberate surface/material language appropriate to the creative direction.
>
> Technology and asset strategy
>
> You have complete freedom.
>
> Choose whatever technology and creative techniques you believe will make the best game:
>
> Three.js / WebGL / Canvas;
> Godot;
> Unity;
> Blender;
> conventional meshes and textures;
> generated assets;
> image-generated concepts;
> shaders;
> sprites;
> code-authored geometry;
> procedural textures;
> bespoke project-local creative tools;
> combinations of these.
>
> Do not choose a technique because it is novel. Do not avoid a conventional technique because it is conventional.
>
> Likewise, do not generalize everything merely because you are writing code.
>
> You are completely free to specifically author individual houses, shops, trees, statues, vehicles, props, characters or other objects if specificity makes them better.
>
> Reuse and abstraction should emerge where they help this particular game. Do not prematurely build a universal WizardBuildingGenerator, generic humanoid system, generic foliage system, or engine unless repeated actual work demonstrates that you need one.
>
> If you encounter repeated friction while making the art and decide you need a small project-specific modeling, drawing, material, animation or inspection tool, build it. But encounter the problem first.
>
> Work like an autonomous game developer
>
> Run the game constantly while developing it.
>
> Build a verification loop early so you can see what you actually made rather than reasoning only from code.
>
> Capture screenshots from the real gameplay camera at normal gameplay scale.
>
> Maintain a few reproducible inspection situations, including:
>
> a developing early settlement;
> a denser mature district;
> neutral daytime;
> your most atmospheric lighting condition;
> close views of representative ordinary buildings and props.
>
> Actually look at those screenshots.
>
> When something appears:
>
> generic;
> placeholder-like;
> visually unfinished;
> badly proportioned;
> repetitive;
> incoherent;
> difficult to read;
> or merely "pretty" without identity;
>
> revise it before moving on.
>
> Also play the real core loop yourself. Test building placement, progression, resources, city growth and failure/recovery states rather than only verifying that individual functions run.
>
> Do at least three serious visual critique-and-revision passes after the game first becomes presentable.
>
> Do not accept "technically complete" as visually complete.
>
> Creative consistency
>
> Treat CREATIVE_CONSTITUTION.md as a living standard, not flavor text.
>
> Once actual artifacts begin working, update the constitution based on what succeeded. Preserve a small set of canonical screenshots that represent the world at its best and use them when creating subsequent objects.
>
> Let the game's visual language emerge through making things, but once you find something strong, commit to it.
>
> What I care about most
>
> I am not evaluating this primarily by architectural cleverness.
>
> I care about:
>
> Is it fun?
> Does the city have a recognizable point of view?
> Does it feel charming and authored rather than generically attractive?
> Do ordinary objects belong to the same world?
> Does progression visibly transform the place?
> Does the game make me want to keep building?
>
> At the end, show me:
>
> how to run it;
> the core gameplay loop;
> CREATIVE_CONSTITUTION.md;
> the technical/artistic medium you chose and why;
> what project-specific creative tools you invented, if any;
> screenshots of early and developed cities in neutral daylight and atmospheric lighting;
> several representative ordinary buildings/props at gameplay scale;
> what you believe gives this particular world its identity;
> what still feels weak or unfinished.
>
> Make me a wizard city I want to keep expanding. Make something you are proud of.

## 2. Repository

> Can you make this a github repo?

## 3. First graphics pass, and the account to use

> Can you improve the graphics? They look a little ghetto ':) and yes, scottdaly please, we can update our claude.md not everything needs to be in gholdsilver

## 4. Charm pass

> Better, but it's still giving ps1 prototype more than charming wizard city

## 5. The style workshop

> Better, but I still feel we can bring in more character. Maybe we try a little workshop where we make buildings in a few different styles, totally different, and see what the feel of the game is, different building styles, textures, shaders, the whole thing.

## 6. Verdict on the first five styles

> They all have two issues, 1. they feel kind of kiddy, and 2. they feel almost undone in a way, like base meshes or something.

(Attached: the paper-cut vignette screenshot, `shots/lab/paper.png`.)

## 7. This record

> Can you push all these changes as well as an md file with all messages I sent you to github?
