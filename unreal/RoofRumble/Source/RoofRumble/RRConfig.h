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
	constexpr float AttackInterval = 0.42f; // s between punches (jab, cross, kick, repeat)
	constexpr float Reach = 1.9f;           // punches hit every Crow in the arc in front of her
	constexpr float ArcDeg = 140.f;
	constexpr float PunchDamage[3] = { 10.f, 12.f, 18.f };
	constexpr float PunchPush[3] = { 1.3f, 1.3f, 3.6f };
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

	// ---- camera (metres): high and behind, steep, never past the north edge ----
	constexpr float CamFovDeg = 48.f;
	constexpr float CamHeight = 15.f;
	constexpr float CamBack = 5.5f;
	constexpr float CamDamping = 7.f;
	constexpr float CamEdgeMargin = 5.f;

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
		case EUp::Haymaker: return FString::Printf(TEXT("Punches hit %d%% harder"), 25 * L);
		case EUp::Quick: return FString::Printf(TEXT("Punch %d%% faster"), 12 * L);
		case EUp::Reach: return FString::Printf(TEXT("+%.1f m reach, wider swing"), 0.3f * L);
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
