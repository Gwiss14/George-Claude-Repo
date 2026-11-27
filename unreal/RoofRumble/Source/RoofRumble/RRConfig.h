// Roof Rumble: every number worth tuning, copied from the web version (game/src/survivor/config.js).
// Gameplay is in metres on the roof's own plane: x = east, z = south (toward the camera).
// The arena converts to Unreal units (centimetres, Z up) only when drawing.
#pragma once

#include "CoreMinimal.h"

namespace RR
{
	// ---- roof ----
	constexpr float ArenaWidth = 18.f;    // x, metres
	constexpr float ArenaDepth = 28.f;    // z, metres (portrait-shaped)
	constexpr float WallThickness = 0.3f;
	constexpr float WallHeight = 0.6f;
	constexpr float RunLength = 300.f;    // survive 5:00 to win

	// ---- Juno ----
	constexpr float JunoHp = 100.f;
	constexpr float JunoSpeed = 5.2f;
	constexpr float JunoRadius = 0.35f;
	constexpr float JunoIframes = 0.75f;
	// J = punch, K = kick. Each hits every Crow within reach in the arc in front of her.
	// Time: how long the move takes; HitAt: when in it the hit lands. Quick Hands shortens both.
	struct FAttackDef { float Damage, Push, Reach, ArcDeg, Time, HitAt; };
	constexpr FAttackDef Punch = { 11.f, 0.6f, 1.8f, 120.f, 0.26f, 0.08f };
	constexpr FAttackDef Kick = { 17.f, 1.4f, 2.2f, 150.f, 0.42f, 0.16f };
	constexpr float ComboWindow = 0.6f;  // s after a move ends that the next press still continues the string
	constexpr float AttackMove = 0.7f;   // move speed while swinging (x normal)
	constexpr float Lunge = 1.4f;        // a press steps her up to this far toward a Crow just out of reach
	constexpr float AimAssist = 1.6f;    // a press turns her toward the nearest Crow within reach + this

	// Combos: the last presses ending in one of these strings make its finisher (checked in this order).
	struct FComboDef { const TCHAR* Keys; const TCHAR* Name; float Damage, Push, Reach, ArcDeg, Hitstop, Coins; };
	constexpr int32 NumCombos = 5;
	constexpr FComboDef Combos[NumCombos] = {
		{ TEXT("JKJK"), TEXT("FURY"),       2.6f, 5.f,   1.6f, 360.f, 0.08f, 2.f }, // shockwave all around
		{ TEXT("JJJ"),  TEXT("TRIPLE JAB"), 2.0f, 3.f,   0.2f, 120.f, 0.04f, 0.f },
		{ TEXT("JJK"),  TEXT("ROUNDHOUSE"), 1.8f, 4.5f,  0.5f, 360.f, 0.05f, 1.f }, // spinning kick
		{ TEXT("KKJ"),  TEXT("UPPERCUT"),   3.4f, 6.f,   0.3f, 80.f,  0.07f, 1.f }, // one huge hit up front
		{ TEXT("KJK"),  TEXT("DROP KICK"),  2.4f, 7.f,   1.0f, 100.f, 0.06f, 1.f }, // flies forward
	};
	constexpr int32 StarterWrench = 1;      // every run starts with Wrench Toss level 1

	// ROLL: a quick dodge-roll. Juno cannot be hurt and slips through the crowd while rolling.
	constexpr float RollSpeed = 12.f;
	constexpr float RollTime = 0.32f;
	constexpr float RollCooldown = 1.4f;
	constexpr float RollIframes = 0.4f;

	// ---- Crows ----
	enum class EKind : uint8 { Grunt, Runner, Thrower, Brute, Boss, Count };

	struct FEnemyDef
	{
		float Hp, Speed, Damage, Radius, Scale, Xp, Mass;
		const TCHAR* Hex;   // jacket colour
	};

	inline const FEnemyDef& Def(EKind K)
	{
		static const FEnemyDef Defs[] = {
			/* Grunt   */ { 20.f,  2.2f, 6.f,  0.32f, 1.0f,  1.f,  1.f,  TEXT("3d4a6b") },
			/* Runner  */ { 12.f,  4.0f, 6.f,  0.28f, 0.85f, 1.f,  0.7f, TEXT("8e5bd6") },
			/* Thrower */ { 26.f,  2.0f, 10.f, 0.32f, 1.0f,  3.f,  1.f,  TEXT("e2782a") },
			/* Brute   */ { 95.f,  1.6f, 13.f, 0.5f,  1.35f, 6.f,  3.f,  TEXT("7a2e3a") },
			/* Boss    */ { 450.f, 1.9f, 20.f, 0.7f,  1.9f,  40.f, 20.f, TEXT("4b1d2a") },
		};
		return Defs[static_cast<int32>(K)];
	}

	constexpr float ThrowerRange = 6.5f;
	constexpr float ThrowEvery = 2.6f;
	constexpr float SmashEvery = 3.5f;
	constexpr float SmashRadius = 2.7f;
	constexpr float SmashWindup = 1.15f;
	constexpr float ContactCooldown = 0.7f; // a Crow touching Juno hurts her, then waits this long

	// ---- spawning ----
	constexpr float SpawnPerSecond = 0.7f;
	constexpr float SpawnGrowth = 1.f / 62.f;   // more per second, every second
	constexpr float SpawnMaxPerSecond = 6.5f;
	constexpr int32 MaxAlive = 110;
	constexpr int32 RunnerPack = 2;
	constexpr float SpawnMinDistance = 8.f;
	constexpr float RunnerFrom = 25.f, ThrowerFrom = 55.f, BruteFrom = 100.f;
	constexpr float HpGrowth = 1.f / 110.f;
	constexpr float BossAt[3] = { 90.f, 180.f, 240.f };

	// ---- coins, xp, heals ----
	constexpr float XpFirst = 5.f, XpPerLevel = 4.f;
	constexpr float Magnet = 2.2f, Pickup = 0.6f, MagnetSpeed = 9.f;
	constexpr float HealChance = 0.035f, HealAmount = 15.f;

	// ---- feel ----
	constexpr float Hitstop = 0.035f;

	// ---- camera (metres): low and angled, behind and above Juno, looking ahead across the roof ----
	constexpr float CamFovDeg = 52.f;       // vertical, on a phone held upright
	constexpr float CamLandscapeFovDeg = 46.f;
	constexpr float CamHeight = 6.8f;
	constexpr float CamBack = 8.5f;
	constexpr float CamLandscapeHeight = 5.6f;
	constexpr float CamLandscapeBack = 8.f;
	constexpr float CamAhead = 3.5f;        // looks this far in front of Juno
	constexpr float CamDamping = 7.f;
	constexpr float CamEdgeMargin = 4.f;

	// ---- upgrades: pick 1 of 3 on each level-up, each to level 5 ----
	enum class EUp : uint8 { Haymaker, Quick, Reach, Pipes, Wrench, Stomp, Sneakers, Magnet, IronSkin, SecondWind, Count, Heal = 255 };

	inline const TCHAR* UpName(EUp U)
	{
		switch (U)
		{
		case EUp::Haymaker: return TEXT("HAYMAKER");
		case EUp::Quick: return TEXT("QUICK HANDS");
		case EUp::Reach: return TEXT("LONG ARMS");
		case EUp::Pipes: return TEXT("ORBIT PIPES");
		case EUp::Wrench: return TEXT("WRENCH TOSS");
		case EUp::Stomp: return TEXT("SHOCKWAVE");
		case EUp::Sneakers: return TEXT("SNEAKERS");
		case EUp::Magnet: return TEXT("COIN MAGNET");
		case EUp::IronSkin: return TEXT("IRON SKIN");
		case EUp::SecondWind: return TEXT("SECOND WIND");
		default: return TEXT("PATCH UP");
		}
	}

	inline FString UpText(EUp U, int32 L)
	{
		switch (U)
		{
		case EUp::Haymaker: return FString::Printf(TEXT("Punches and kicks hit %d%% harder"), 25 * L);
		case EUp::Quick: return FString::Printf(TEXT("Punch and kick %d%% faster"), 12 * L);
		case EUp::Reach: return FString::Printf(TEXT("+%.1f m reach, wider swings"), 0.3f * L);
		case EUp::Pipes: return FString::Printf(TEXT("%d pipe%s spin around you"), FMath::Min(L, 4), L > 1 ? TEXT("s") : TEXT(""));
		case EUp::Wrench: return FString::Printf(TEXT("Throw %d wrench%s every %.1f s"), 1 + (L - 1) / 2, L > 2 ? TEXT("es") : TEXT(""), 1.7f - 0.2f * L);
		case EUp::Stomp: return FString::Printf(TEXT("Stomp every %.1f s, knocks Crows back"), 3.4f - 0.3f * L);
		case EUp::Sneakers: return FString::Printf(TEXT("Run %d%% faster"), 10 * L);
		case EUp::Magnet: return FString::Printf(TEXT("Pull coins from %.1f m"), Magnet * (1.f + 0.45f * L));
		case EUp::IronSkin: return TEXT("+20 max health and heal 20");
		case EUp::SecondWind: return FString::Printf(TEXT("Every %d KOs heal 4"), 10 - L);
		default: return TEXT("Heal 30");
		}
	}

	// ---- shop: permanent upgrades bought with banked coins ----
	enum class EShop : uint8 { Might, Vitality, Swift, Greed, Revive, Count };

	struct FShopDef { const TCHAR* Name; TArray<int32> Costs; };

	inline const FShopDef& ShopDef(EShop S)
	{
		static const FShopDef Defs[] = {
			{ TEXT("MIGHT"),    { 30, 60, 110, 180, 280 } },
			{ TEXT("VITALITY"), { 30, 60, 110, 180, 280 } },
			{ TEXT("SWIFT"),    { 40, 90, 160 } },
			{ TEXT("GREED"),    { 40, 90, 160 } },
			{ TEXT("REVIVE"),   { 250 } },
		};
		return Defs[static_cast<int32>(S)];
	}

	inline FString ShopText(EShop S, int32 L)
	{
		L = FMath::Max(L, 1);
		switch (S)
		{
		case EShop::Might: return FString::Printf(TEXT("+%d%% damage"), 8 * L);
		case EShop::Vitality: return FString::Printf(TEXT("+%d max health"), 15 * L);
		case EShop::Swift: return FString::Printf(TEXT("+%d%% speed"), 5 * L);
		case EShop::Greed: return FString::Printf(TEXT("+%d%% coins"), 15 * L);
		default: return TEXT("Get back up once per run");
		}
	}
}
