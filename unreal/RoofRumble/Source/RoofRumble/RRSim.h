// One run of Roof Rumble: Juno auto-fights swarms of Tin Crows for 5 minutes.
// Plain C++, no UObjects: a direct port of the web game's sim.js. Nothing here knows how anything looks.
// Units are metres on the roof plane (x east, z south); yaw 0 faces +z.
#pragma once

#include "CoreMinimal.h"
#include "RRConfig.h"

struct FRRShop { int32 Level[(int32)RR::EShop::Count] = { 0 }; int32 Get(RR::EShop S) const { return Level[(int32)S]; } };

struct FRRSolid { bool bCircle = true; float X = 0, Z = 0, R = 0, Hx = 0, Hz = 0, Height = 1; FName Id; float Yaw = 0.f; };

struct FRRJuno
{
	float X = 0, Z = 2, Px = 0, Pz = 2, Vx = 0, Vz = 0, Kx = 0, Kz = 0, Yaw = PI, Radius = RR::JunoRadius;
	float Hp = RR::JunoHp, MaxHp = RR::JunoHp, Iframes = 0, AttackT = 0.3f, Swing = 0, SpeedNow = 0;
	int32 Chain = 0, SwingChain = 0;
	int32 Level = 1; float Xp = 0, XpNeed = RR::XpFirst;
	int32 Ups[(int32)RR::EUp::Count] = { 0 };
	int32 KoCount = 0;
	float PipeAngle = 0, WrenchT = 1, StompT = 2;
	float RollT = 0, RollCd = 0, RollX = 0, RollZ = 1; int32 Rolls = 0;
};

struct FRREnemy
{
	int32 Id = 0; RR::EKind Kind = RR::EKind::Grunt;
	float X = 0, Z = 0, Px = 0, Pz = 0, Vx = 0, Vz = 0, Kx = 0, Kz = 0, Yaw = 0, Radius = 0.3f;
	float Hp = 1, MaxHp = 1, Flash = 0, Cd = 0, Walk = 0, DeadT = 0, HurtT = 0;
	float ThrowT = 1, SmashT = 0, Windup = 0, PipeCd = 0; float Strafe = 1;
	bool bDead = false;
};

struct FRRCoin { float X = 0, Z = 0, Y = 0, Px = 0, Pz = 0, Py = 0, Vx = 0, Vz = 0, Vy = 0, Value = 0, Heal = 0, Age = 0; bool bDead = false; };
struct FRRShot { float X = 0, Z = 0, Y = 0, Px = 0, Pz = 0, Py = 0, Vx = 0, Vz = 0, Vy = 0, Life = 0, Damage = 0; bool bDead = false; };              // wrench thrown by a Crow
struct FRRToss { float X = 0, Z = 0, Px = 0, Pz = 0, Vx = 0, Vz = 0, Life = 0; int32 Pierce = 1; TArray<int32> Hit; bool bDead = false; }; // wrench thrown by Juno

enum class ERRPhase : uint8 { Play, LevelUp, Dead, Won };

// Things that happened this step, for sounds, words, shakes and screens.
struct FRREvent { FName Type; float X = 0, Z = 0, Amount = 0; RR::EKind Kind = RR::EKind::Grunt; FString Source; };

struct FRRInput { float Mx = 0, Mz = 0; int32 Roll = 0; };

class FRRSim
{
public:
	FRRShop Meta;
	float Time = 0;
	ERRPhase Phase = ERRPhase::Play;
	FRRJuno Juno;
	TArray<FRREnemy> Enemies;
	TArray<FRRCoin> Coins;
	TArray<FRRShot> Shots;
	TArray<FRRToss> Tosses;
	TArray<FRRSolid> Solids;
	TArray<FRREvent> Events;      // the arena drains these each frame
	TArray<RR::EUp> Choices;      // level-up cards on offer
	int32 Kills = 0; float Bank = 0; float Hitstop = 0;
	int32 PendingLevels = 0, Revives = 0, BossIndex = 0, Uid = 1; float SpawnAcc = 0;

	void Reset(const FRRShop& InMeta);
	void Step(float Dt, FRRInput& In);
	void Choose(RR::EUp Key);

	int32 Lv(RR::EUp U) const { return Juno.Ups[(int32)U]; }
	float DmgMul() const { return (1.f + 0.25f * Lv(RR::EUp::Haymaker)) * (1.f + 0.08f * Meta.Get(RR::EShop::Might)); }
	float Interval() const { return RR::AttackInterval * FMath::Pow(0.88f, (float)Lv(RR::EUp::Quick)); }
	float ReachM() const { return RR::Reach + 0.3f * Lv(RR::EUp::Reach); }
	float Arc() const { return FMath::DegreesToRadians(RR::ArcDeg + 12.f * Lv(RR::EUp::Reach)); }
	float Speed() const { return RR::JunoSpeed * (1.f + 0.1f * Lv(RR::EUp::Sneakers)) * (1.f + 0.05f * Meta.Get(RR::EShop::Swift)); }
	float MagnetR() const { return RR::Magnet * (1.f + 0.45f * Lv(RR::EUp::Magnet)); }
	float CoinMul() const { return 1.f + 0.15f * Meta.Get(RR::EShop::Greed); }
	int32 LiveCount() const;

private:
	void Emit(FName Type, float X = 0, float Z = 0, float Amount = 0, RR::EKind Kind = RR::EKind::Grunt, const FString& Source = FString());
	void Spawn(float Dt);
	void AddEnemy(RR::EKind Kind, float HpScale);
	void MoveJuno(float Dt, FRRInput& In);
	void AutoAttack(float Dt);
	void Weapons(float Dt);
	void Damage(FRREnemy& E, float Amount, float Push, float Nx, float Nz, const FString& Source);
	void Kill(FRREnemy& E);
	bool HurtJuno(float Amount, float FromX, float FromZ, float Push);
	void MoveEnemies(float Dt);
	void Separate();
	void Projectiles(float Dt);
	void Pickups(float Dt);
	void OfferLevelUp();
	void Cleanup();
	template <typename T> void KeepOut(T& F, float R) const;
	float Penetration(float X, float Z, float R) const;
};
