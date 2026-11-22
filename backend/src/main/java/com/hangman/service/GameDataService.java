package com.hangman.service;
import com.hangman.model.GameCharacter;
import java.util.ArrayList;
import com.hangman.model.NPC;
import com.hangman.model.NPCAppearance;
import com.hangman.model.QuestItem;
import com.hangman.model.GameData;
import org.springframework.stereotype.Service;
import com.hangman.model.Boss;

import java.util.List;

@Service
public class GameDataService {

    public GameDataService() {
    validateCharacterIntroductions();
}

private void validateCharacterIntroductions() {
    List<GameCharacter> characters = new ArrayList<>(NPCS);
    characters.add(BOSS);

    for (GameCharacter character : characters) {
        String introduction = character.getIntroduction();

        if (introduction == null || introduction.isBlank()) {
            throw new IllegalStateException(
                "Missing introduction for: " + character.getName()
            );
        }
    }
}

    private static final int GROUND_Y = 370;

    private static final List<NPC> NPCS = List.of(

        new NPC(
            "Luigi",
            600,
            null,
            List.of(),
            "pocket-knife",
            "Animal",
            5,
            8,
            new NPCAppearance("#f1c08a", "#5fe0b0", "#7a5230", "spiky", "#5a3418", null),
            "Unleash Biscuit the dog",
            "Biscuit is loose! Woof!",
            "The knot tightened… −1 heart",
            70,
            GROUND_Y - 30,
            "Oh no! Biscuit's leash is caught in a nasty knot. Can you help me free this little troublemaker?",
            null,
            null,
            "Biscuit is free! I found this Pocket Knife near the post. Take it, you might need it!"
        ),

        new NPC(
            "Jasmine",
            1040,
            null,
            List.of("brass-key"),
            "bait-recipe",
            "Place",
            6,
            9,
            new NPCAppearance("#ffd3a1", "#d98ad1", "#6b4fa0", "bun", "#eeeeee", "glasses"),
            "Open Polly the parrot's cage",
            "Polly is flying free!",
            "The lock stayed shut… −1 heart",
            70,
            GROUND_Y - 70,
            "Oh dear! Polly is trapped in her cage, and I've lost the spare key! How will I get her out?",
            "I need a spare Brass Key to open it. Farmer Joe found an old one in his field. Could you ask him, sweetie?",
            "You found the Brass Key! Wonderful! Let's get Polly out of there!",
            "Polly is free! Here, take my Bait Recipe. It helped my husband catch some rare fish!"
        ),

        new NPC(
            "Zed",
            1540,
            null,
            List.of("machine-oil"),
            "old-compass",
            "Food",
            5,
            9,
            new NPCAppearance("#e8b07a", "#ffffff", "#2a45c9", "cap", "#ff9ac1", "stache"),
            "Lower the Mega Swirl lollipop",
            "The Mega Swirl is back on the counter!",
            "The rope held… −1 heart",
            40,
            GROUND_Y - 70,
            "My Mega Swirl is stuck up there! The pulley is jammed, and I can't bring it down!",
            "The pulley needs Machine Oil to loosen up. Zara might have some in her workshop. Could you get it for me?",
            "Machine Oil! Perfect! Let's get that Mega Swirl down!",
            "My Mega Swirl is back! Take this Old Compass. It helped me navigate when I was a sailor!"
        ),

        new NPC(
            "Erickson",
            2230,
            null,
            List.of("bee-smoker"),
            "iron-gear",
            "Animal",
            5,
            9,
            new NPCAppearance("#8a5a35", "#a8703d", "#6e4526", "ears", "#6e4526", null),
            "Get the honey jar down",
            "The honey jar is down! The bees are thrilled.",
            "The jar didn't budge… −1 heart",
            50,
            GROUND_Y - 30,
            "Grr! My honey jar is stuck in that tree, and angry bees are guarding it. I can't get near!",
            "A Bee Smoker would calm the swarm long enough to retrieve my honey. Finn might have one. Could you ask him?",
            "Grr! A Bee Smoker! Now those bees won't bother me. Let's get that honey!",
            "Honey secured! Take this spare Iron Gear from my broken extractor. Rex-9 might need it!"
        ),

        new NPC(
            "Gino",
            2910,
            null,
            List.of("iron-gear"),
            "power-cell",
            "Arcade",
            5,
            10,
            new NPCAppearance("#b8c4d6", "#5b6b8a", "#3a4560", "robot", "#ff6f7d", null),
            "Reboot robot pal Bit",
            "Bit is online and dancing!",
            "Reboot failed… −1 heart",
            70,
            GROUND_Y - 30,
            "BEEP. My friend Bit has stopped working! His motor is damaged, and I cannot repair it without a replacement part.",
            "BEEP. Bit needs an Iron Gear for repairs. Erickson may have a spare from his honey extractor. Please retrieve one.",
            "BEEP. Iron Gear detected! Repairs can begin. Let's get Bit running again!",
            "BEEP. Bit is back online! Take this charged Power Cell. It might power the old town gate!"
        ),

        new NPC(
            "Finn",
            3560,
            null,
            List.of("bait-recipe", "old-compass"),
            "bee-smoker",
            "Sea",
            6,
            9,
            new NPCAppearance("#e8b07a", "#2a9bd1", "#3a4560", "fisher", "#ffd23c", "beard"),
            "Reel in the Golden Fish",
            "The Golden Fish is on the dock!",
            "The line snapped… −1 heart",
            70,
            GROUND_Y - 30,
            "Ahoy! A giant fish has taken my fishing line! I think it's the legendary Golden Fish, but I need a way to track and lure it!",
            "I'll need a Bait Recipe from Jasmine and an Old Compass from Zed to catch it. Could you collect both?",
            "You've got both! Excellent! Let's prepare the bait and track down that Golden Fish!",
            "What a catch! I also found this Bee Smoker in the supply crate. Bruno could use it!"
        ),

        new NPC(
            "Zara",
            4180,
            null,
            List.of("pocket-knife"),
            "machine-oil",
            "Magic",
            6,
            9,
            new NPCAppearance("#ffd3a1", "#6b3fb0", "#3b2470", "wizard", "#6b3fb0", "beard"),
            "Wake the sleeping cauldron",
            "The cauldron is bubbling happily!",
            "The spell fizzled… −1 heart",
            70,
            GROUND_Y - 30,
            "My cauldron has gone cold! Dried roots are blocking its air vent, and I can't clear them by hand!",
            "A Pocket Knife could clear the roots blocking my cauldron's air vent. Luigi might have one. Could you bring it here?",
            "A Pocket Knife! Perfect! Let's clear this vent and get the cauldron burning again!",
            "The cauldron is working again! Take this Machine Oil. It should help someone repair an old mechanism!"
        ),

        new NPC(
            "Farmer Joe",
            4820,
            null,
            List.of("pocket-knife"),
            "brass-key",
            "Farm",
            4,
            9,
            new NPCAppearance("#e8b07a", "#c9394a", "#2a45c9", "straw", "#f2d27a", null),
            "Free the Giant Pumpkin",
            "The Giant Pumpkin rolled free!",
            "The vines held tight… −1 heart",
            70,
            GROUND_Y - 30,
            "Howdy! My prize pumpkin is trapped in some stubborn vines. I can't pull them apart!",
            "I need a Pocket Knife to cut through these stubborn vines. Luigi might have one. Could you borrow it for me?",
            "Howdy! Just what I needed! Let's cut through those vines and free my prize pumpkin!",
            "Pumpkin's free! I found this old Brass Key buried near the vines. Maybe someone needs it!"
        )
    );

    private static final List<QuestItem> ITEMS = List.of(

        new QuestItem(
            "pocket-knife",
            "Pocket Knife",
            "🔪",
            "A small folding knife useful for cutting and clearing tangled materials."
        ),

        new QuestItem(
            "brass-key",
            "Brass Key",
            "🗝️",
            "An old spare key that fits Polly's cage lock."
        ),

        new QuestItem(
            "machine-oil",
            "Machine Oil",
            "🧴",
            "A small bottle of oil used to loosen stiff and rusty mechanisms."
        ),

        new QuestItem(
            "bait-recipe",
            "Bait Recipe",
            "📜",
            "A recipe for preparing bait that attracts rare fish."
        ),

        new QuestItem(
            "old-compass",
            "Old Compass",
            "🧭",
            "A working compass that helps sailors navigate unfamiliar waters."
        ),

        new QuestItem(
            "bee-smoker",
            "Bee Smoker",
            "🐝",
            "A beekeeper's tool that produces cool smoke to calm a swarm."
        ),

        new QuestItem(
            "iron-gear",
            "Iron Gear",
            "⚙️",
            "A spare metal gear salvaged from an old honey extractor."
        ),

        new QuestItem(
            "power-cell",
            "Power Cell",
            "🔋",
            "A fully charged energy cell capable of powering an old machine."
        )
    );

    private static final Boss BOSS = new Boss(
    "The Hangman King",
    5250,
    290,
    "Boss",
    5,
    8,
    new NPCAppearance(
        "#b8c9ff",
        "#30234b",
        "#171326",
        "coder",
        "#67e8f9",
        null
    ),
    10,
    10,
    50,
   List.of(
    "Wait... You're not one of them, are you?",
    "An outsider... Finally, someone new.",
    "This town isn't what it seems. Its people are recreations, trapped in an endless time loop.",
    "I've spent years protecting them while searching for the one responsible.",
    "But I can't do both forever. I need someone to take my place.",
    "Perhaps that someone is you.",
    "But I won't entrust their lives to just anyone.",
    "Prove yourself. Face me in battle and show me you're worthy of my trust.",
    "If you succeed, I'll leave the town in your care while I hunt down the one behind all this.",
    "I need to know they'll be safe in your hands.",
    "Now then, little hero... show me what you've got."
),
    "The final word",
    "The Hangman King has fallen!",
    "You already defeated me..."
);

    public GameData getGameData() {
        return new GameData(NPCS, ITEMS, BOSS);
    }
}