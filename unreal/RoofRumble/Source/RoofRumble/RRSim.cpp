#include "RRSim.h"

using namespace RR;

namespace
{
	float Wrap(float A) { A = FMath::Fmod(A + PI, 2.f * PI); if (A < 0) A += 2.f * PI; return A - PI; }
	float Turn(float A, float Target, float K) { return Wrap(A + Wrap(Target - A) * FMath::Min(1.f, K)); }
	float Rand(float A, float B) { return A + FMath::FRand() * (B - A); }

	FRRCoin MakeCoin(float X, float Z, float Vx, float Vz, float Vy, float Value, float Heal)
	{
		FRRCoin C;
		C.X = C.Px = X; C.Z = C.Pz = Z; C.Y = C.Py = 0.6f;
		C.Vx = Vx; C.Vz = Vz; C.Vy = Vy; C.Value = Value; C.Heal = Heal; C.Age = 0;
		return C;
	}
}

// ---- collisions with props and walls ---------------------------------------------------------
template <typename T>
void FRRSim::KeepOut(T& F, float R) const
{
	for (const FRRSolid& S : Solids)
	{
		if (S.bCircle)
		{
			const float Dx = F.X - S.X, Dz = F.Z - S.Z, D = FMath::Sqrt(Dx * Dx + Dz * Dz), Min = S.R + R;
			if (D < Min) { const float Nx = D > 1e-4f ? Dx / D : 0, Nz = D > 1e-4f ? Dz / D : 1; F.X = S.X + Nx * Min; F.Z = S.Z + Nz * Min; }
		}
		else
		{
			const float Cx = FMath::Clamp(F.X, S.X - S.Hx, S.X + S.Hx), Cz = FMath::Clamp(F.Z, S.Z - S.Hz, S.Z + S.Hz);
			const float Dx = F.X - Cx, Dz = F.Z - Cz, D = FMath::Sqrt(Dx * Dx + Dz * Dz);
			if (D > 1e-4f && D < R) { F.X = Cx + Dx / D * R; F.Z = Cz + Dz / D * R; }
			else if (D <= 1e-4f)
			{
				const float Px = S.Hx + R - FMath::Abs(F.X - S.X), Pz = S.Hz + R - FMath::Abs(F.Z - S.Z);
				if (Px < Pz) F.X = S.X + (F.X - S.X >= 0 ? 1.f : -1.f) * (S.Hx + R); else F.Z = S.Z + (F.Z - S.Z >= 0 ? 1.f : -1.f) * (S.Hz + R);
			}
		}
	}
	const float Hw = ArenaWidth / 2 - WallThickness - R, Hd = ArenaDepth / 2 - WallThickness - R;
	F.X = FMath::Clamp(F.X, -Hw, Hw);
	F.Z = FMath::Clamp(F.Z, -Hd, Hd);
}

void FRRSim::Emit(FName Type, float X, float Z, float Amount, EKind Kind, const FString& Source)
{
	FRREvent E; E.Type = Type; E.X = X; E.Z = Z; E.Amount = Amount; E.Kind = Kind; E.Source = Source;
	Events.Add(E);
}

int32 FRRSim::LiveCount() const
{
	int32 N = 0;
	for (const FRREnemy& E : Enemies) if (!E.bDead) N++;
	return N;
}

void FRRSim::Reset(const FRRShop& InMeta)
{
	Meta = InMeta;
	Time = 0; Phase = ERRPhase::Play; Uid = 1;
	Enemies.Reset(); Coins.Reset(); Shots.Reset(); Tosses.Reset(); Choices.Reset();
	SpawnAcc = 0; BossIndex = 0; Kills = 0; Bank = 0; Hitstop = 0; PendingLevels = 0;
	Revives = Meta.Get(EShop::Revive) > 0 ? 1 : 0;

	Solids.Reset();
	auto Circle = [this](FName Id, float X, float Z, float R, float H)
	{
		FRRSolid S; S.bCircle = true; S.X = X; S.Z = Z; S.R = R; S.Height = H; S.Id = Id; Solids.Add(S);
	};
	auto Box = [this](FName Id, float X, float Z, float Yaw)
	{
		FRRSolid S; S.bCircle = false; S.X = X; S.Z = Z; S.Hx = S.Hz = 0.5f; S.Height = 1.f; S.Id = Id; S.Yaw = Yaw; Solids.Add(S);
	};
	Circle(TEXT("water_tank"), -5.5f, -9.f, 1.f, 2.5f);
	Circle(TEXT("water_tank"), 5.5f, 8.f, 1.f, 2.5f);
	Box(TEXT("crate"), -6.f, 3.f, 0.f); Box(TEXT("crate"), -6.f, 4.f, HALF_PI);
	Box(TEXT("crate"), 6.f, -3.f, PI); Box(TEXT("crate"), 6.f, -4.f, 0.f);
	Box(TEXT("crate"), 1.5f, -11.f, 0.6f); Box(TEXT("crate"), -2.f, 11.f, 0.3f);
	const float LampX[2] = { -8.4f, 8.4f }, LampZ[2] = { -13.4f, 13.4f };
	for (float Sx : LampX) for (float Sz : LampZ) Circle(TEXT("lamp_post"), Sx, Sz, 0.15f, 3.5f);

	Juno = FRRJuno();
	Juno.MaxHp = Juno.Hp = JunoHp + 15.f * Meta.Get(EShop::Vitality);
	Juno.Ups[(int32)EUp::Wrench] = StarterWrench;
	Emit(TEXT("reset"));
}

void FRRSim::Step(float Dt, FRRInput& In)
{
	if (Phase != ERRPhase::Play) return;
	if (Hitstop > 0) { Hitstop -= Dt; return; } // the whole roof freezes for a heartbeat on a big hit
	Time += Dt;
	Juno.Px = Juno.X; Juno.Pz = Juno.Z;
	for (FRREnemy& E : Enemies) { E.Px = E.X; E.Pz = E.Z; }
	for (FRRCoin& C : Coins) { C.Px = C.X; C.Pz = C.Z; C.Py = C.Y; }
	for (FRRShot& S : Shots) { S.Px = S.X; S.Pz = S.Z; S.Py = S.Y; }
	for (FRRToss& S : Tosses) { S.Px = S.X; S.Pz = S.Z; }

	Spawn(Dt);
	MoveJuno(Dt, In);
	AutoAttack(Dt);
	Weapons(Dt);
	MoveEnemies(Dt);
	Projectiles(Dt);
	Pickups(Dt);
	Cleanup();

	if (Time >= RunLength && Phase == ERRPhase::Play)
	{
		Phase = ERRPhase::Won;
		Emit(TEXT("won"));
	}
}

// ---- spawning --------------------------------------------------------------------------
void FRRSim::Spawn(float Dt)
{
	if (BossIndex < 3 && Time >= BossAt[BossIndex])
	{
		AddEnemy(EKind::Boss, 1.f + BossIndex * 0.8f);
		BossIndex++;
		Emit(TEXT("boss"), 0, 0, (float)BossIndex);
	}
	const float Rate = FMath::Min(SpawnMaxPerSecond, SpawnPerSecond + SpawnGrowth * Time);
	SpawnAcc += Rate * Dt;
	while (SpawnAcc >= 1.f)
	{
		SpawnAcc -= 1.f;
		if (LiveCount() >= MaxAlive) break;
		// which Crow climbs in: weighted by what has unlocked so far
		EKind Kinds[4] = { EKind::Grunt, EKind::Runner, EKind::Thrower, EKind::Brute };
		float Weights[4] = { 6.f, Time >= RunnerFrom ? 3.f : 0.f, Time >= ThrowerFrom ? 1.4f : 0.f, Time >= BruteFrom ? 1.f : 0.f };
		const float Total = Weights[0] + Weights[1] + Weights[2] + Weights[3];
		float R = FMath::FRand() * Total; EKind Kind = EKind::Grunt;
		for (int32 k = 0; k < 4; k++) { if (Weights[k] > 0 && (R -= Weights[k]) <= 0) { Kind = Kinds[k]; break; } }
		const int32 N = Kind == EKind::Runner ? RunnerPack : 1; // runners come in packs
		for (int32 i = 0; i < N; i++) AddEnemy(Kind, 1.f);
	}
}

void FRRSim::AddEnemy(EKind Kind, float HpScale)
{
	const FEnemyDef& D = Def(Kind);
	const float Hw = ArenaWidth / 2 - WallThickness - D.Radius, Hd = ArenaDepth / 2 - WallThickness - D.Radius;
	float X = 0, Z = 0;
	for (int32 Tries = 0; Tries < 20; Tries++) // climb in over the wall, away from Juno
	{
		const int32 Side = FMath::RandRange(0, 3);
		X = Side < 2 ? Rand(-Hw, Hw) : (Side == 2 ? -Hw : Hw);
		Z = Side >= 2 ? Rand(-Hd, Hd) : (Side == 0 ? -Hd : Hd);
		if (FMath::Sqrt(FMath::Square(X - Juno.X) + FMath::Square(Z - Juno.Z)) >= SpawnMinDistance && Penetration(X, Z, D.Radius) <= 0) break;
	}
	FRREnemy E;
	E.Id = Uid++; E.Kind = Kind; E.X = E.Px = X; E.Z = E.Pz = Z; E.Radius = D.Radius;
	E.Hp = E.MaxHp = FMath::RoundToFloat(D.Hp * (1.f + HpGrowth * Time) * HpScale);
	E.Walk = Rand(0, 6); E.ThrowT = Rand(1, ThrowEvery); E.SmashT = SmashEvery; E.Strafe = FMath::FRand() < 0.5f ? 1.f : -1.f;
	Enemies.Add(E);
}

// ---- Juno ----------------------------------------------------------------------------------
void FRRSim::MoveJuno(float Dt, FRRInput& In)
{
	FRRJuno& J = Juno;
	J.Iframes = FMath::Max(0.f, J.Iframes - Dt);
	J.RollCd = FMath::Max(0.f, J.RollCd - Dt);
	const float M = FMath::Sqrt(In.Mx * In.Mx + In.Mz * In.Mz);
	if (In.Roll > 0)
	{
		In.Roll = 0;
		if (J.RollCd <= 0 && J.RollT <= 0)
		{
			// roll the way the thumb points, or straight ahead when standing still
			J.RollX = M > 0.05f ? In.Mx / M : FMath::Sin(J.Yaw);
			J.RollZ = M > 0.05f ? In.Mz / M : FMath::Cos(J.Yaw);
			J.Yaw = FMath::Atan2(J.RollX, J.RollZ);
			J.RollT = RollTime; J.RollCd = RollCooldown; J.Rolls++;
			J.Iframes = FMath::Max(J.Iframes, RollIframes);
			J.Swing = 0;
			Emit(TEXT("roll"), J.X, J.Z);
		}
	}
	if (J.RollT > 0)
	{
		J.RollT -= Dt;
		const float K = RollSpeed * (0.45f + 0.55f * FMath::Max(0.f, J.RollT) / RollTime); // fast out, easing off
		J.Vx = J.RollX * K; J.Vz = J.RollZ * K;
		J.X += J.Vx * Dt; J.Z += J.Vz * Dt;
		KeepOut(J, J.Radius);
		if (Penetration(J.X, J.Z, J.Radius) > 0.005f) { J.X = J.Px; J.Z = J.Pz; }
		J.SpeedNow = FMath::Sqrt(FMath::Square(J.X - J.Px) + FMath::Square(J.Z - J.Pz)) / Dt;
		return;
	}
	const float S = Speed() * FMath::Min(1.f, M);
	J.Vx = M > 0.05f ? (In.Mx / M) * S : 0;
	J.Vz = M > 0.05f ? (In.Mz / M) * S : 0;
	if (M > 0.05f && J.Swing <= 0) J.Yaw = Turn(J.Yaw, FMath::Atan2(In.Mx, In.Mz), 14.f * Dt);
	const float Decay = FMath::Exp(-10.f * Dt);
	J.X += (J.Vx + J.Kx) * Dt; J.Z += (J.Vz + J.Kz) * Dt;
	J.Kx *= Decay; J.Kz *= Decay;
	KeepOut(J, J.Radius);
	if (Penetration(J.X, J.Z, J.Radius) > 0.005f) { J.X = J.Px; J.Z = J.Pz; }
	J.SpeedNow = FMath::Sqrt(FMath::Square(J.X - J.Px) + FMath::Square(J.Z - J.Pz)) / Dt;
}

void FRRSim::AutoAttack(float Dt)
{
	FRRJuno& J = Juno;
	if (J.RollT > 0) return; // no punching mid-roll
	J.AttackT -= Dt;
	J.Swing = FMath::Max(0.f, J.Swing - Dt);
	if (J.AttackT > 0) return;

	FRREnemy* Target = nullptr; float Best = ReachM() + 0.2f;
	for (FRREnemy& E : Enemies)
	{
		if (E.bDead) continue;
		const float D = FMath::Sqrt(FMath::Square(E.X - J.X) + FMath::Square(E.Z - J.Z)) - E.Radius;
		if (D < Best) { Best = D; Target = &E; }
	}
	if (!Target) { J.Chain = 0; return; }
	J.Yaw = FMath::Atan2(Target->X - J.X, Target->Z - J.Z);
	const int32 C = J.Chain;
	const float Dmg = PunchDamage[C] * DmgMul(), Push = PunchPush[C], HalfArc = Arc() / 2;
	int32 Hits = 0;
	for (FRREnemy& E : Enemies)
	{
		if (E.bDead) continue;
		const float Dx = E.X - J.X, Dz = E.Z - J.Z, D = FMath::Sqrt(Dx * Dx + Dz * Dz);
		if (D - E.Radius > ReachM()) continue;
		if (D > 0.1f && FMath::Abs(Wrap(FMath::Atan2(Dx, Dz) - J.Yaw)) > HalfArc) continue;
		const float Inv = D > 0.f ? 1.f / D : 1.f;
		Damage(E, Dmg, Push, Dx * Inv, Dz * Inv, C == 2 ? TEXT("kick") : TEXT("punch"));
		Hits++;
	}
	J.Swing = 0.22f; J.SwingChain = C;
	J.Chain = (C + 1) % 3;
	J.AttackT = Interval();
	if (Hits && C == 2) Hitstop = RR::Hitstop;
	Emit(TEXT("swing"), J.X, J.Z, (float)Hits, EKind::Grunt, C == 2 ? TEXT("kick") : TEXT("punch"));
}

void FRRSim::Weapons(float Dt)
{
	FRRJuno& J = Juno;
	// orbiting pipes
	const int32 Pipes = FMath::Min(4, Lv(EUp::Pipes));
	if (Pipes)
	{
		J.PipeAngle += Dt * (3.f + 0.3f * Lv(EUp::Pipes));
		for (int32 i = 0; i < Pipes; i++)
		{
			const float A = J.PipeAngle + (float)i / Pipes * 2.f * PI;
			const float Px = J.X + FMath::Sin(A) * 1.9f, Pz = J.Z + FMath::Cos(A) * 1.9f;
			for (FRREnemy& E : Enemies)
			{
				if (E.bDead || E.PipeCd > 0 || FMath::Sqrt(FMath::Square(E.X - Px) + FMath::Square(E.Z - Pz)) > E.Radius + 0.35f) continue;
				E.PipeCd = 0.45f;
				Damage(E, (9.f + 3.f * Lv(EUp::Pipes)) * DmgMul(), 1.4f, FMath::Sin(A + HALF_PI), FMath::Cos(A + HALF_PI), TEXT("pipe"));
			}
		}
	}
	// wrench toss
	const int32 W = Lv(EUp::Wrench);
	if (W)
	{
		J.WrenchT -= Dt;
		if (J.WrenchT <= 0)
		{
			J.WrenchT = 1.7f - 0.2f * W;
			const int32 N = 1 + (W - 1) / 2;
			TArray<int32> Near;
			for (int32 i = 0; i < Enemies.Num(); i++)
				if (!Enemies[i].bDead && FMath::Sqrt(FMath::Square(Enemies[i].X - J.X) + FMath::Square(Enemies[i].Z - J.Z)) < 9.f) Near.Add(i);
			for (int32 k = 0; k < N && Near.Num(); k++)
			{
				const int32 Pick = FMath::RandRange(0, Near.Num() - 1);
				const FRREnemy& T = Enemies[Near[Pick]];
				Near.RemoveAtSwap(Pick);
				const float Dx = T.X - J.X, Dz = T.Z - J.Z, D = FMath::Max(0.01f, FMath::Sqrt(Dx * Dx + Dz * Dz));
				FRRToss Toss;
				Toss.X = Toss.Px = J.X; Toss.Z = Toss.Pz = J.Z;
				Toss.Vx = Dx / D * 13.f; Toss.Vz = Dz / D * 13.f; Toss.Life = 1.2f; Toss.Pierce = W >= 4 ? 2 : 1;
				Tosses.Add(Toss);
			}
			Emit(TEXT("toss"));
		}
	}
	// shockwave stomp
	const int32 St = Lv(EUp::Stomp);
	if (St)
	{
		J.StompT -= Dt;
		if (J.StompT <= 0)
		{
			J.StompT = 3.4f - 0.3f * St;
			const float R = 2.4f + 0.3f * St;
			for (FRREnemy& E : Enemies)
			{
				if (E.bDead) continue;
				const float Dx = E.X - J.X, Dz = E.Z - J.Z, D = FMath::Sqrt(Dx * Dx + Dz * Dz);
				if (D - E.Radius > R) continue;
				const float Inv = D > 0.f ? 1.f / D : 1.f;
				Damage(E, (14.f + 8.f * St) * DmgMul(), 4.f, Dx * Inv, Dz * Inv, TEXT("stomp"));
			}
			Emit(TEXT("stomp"), J.X, J.Z, R);
		}
	}
}

void FRRSim::Damage(FRREnemy& E, float Amount, float Push, float Nx, float Nz, const FString& Source)
{
	if (E.bDead) return;
	E.Hp -= Amount; E.Flash = 0.1f; E.HurtT = 0.18f;
	const float K = Push / Def(E.Kind).Mass;
	E.Kx += Nx * K * 10.f; E.Kz += Nz * K * 10.f;
	Emit(TEXT("hit"), E.X, E.Z, Amount, E.Kind, Source);
	if (E.Hp <= 0) Kill(E);
}

void FRRSim::Kill(FRREnemy& E)
{
	E.bDead = true; E.DeadT = 0;
	Kills++;
	const float Value = Def(E.Kind).Xp;
	const int32 N = (int32)FMath::Min(6.f, Value); // big Crows burst into several coins
	for (int32 i = 0; i < N; i++)
	{
		const float A = FMath::FRand() * 2.f * PI, Sp = Rand(1.5f, 3.5f);
		Coins.Add(MakeCoin(E.X, E.Z, FMath::Cos(A) * Sp, FMath::Sin(A) * Sp, Rand(3, 5), Value / N, 0.f));
	}
	if (FMath::FRand() < HealChance || (E.Kind == EKind::Brute && FMath::FRand() < 0.3f))
		Coins.Add(MakeCoin(E.X, E.Z, Rand(-1, 1), Rand(-1, 1), 4.f, 0.f, HealAmount)); // soda can
	const int32 Sw = Lv(EUp::SecondWind);
	if (Sw && ++Juno.KoCount >= 10 - Sw) { Juno.KoCount = 0; Juno.Hp = FMath::Min(Juno.MaxHp, Juno.Hp + 4.f); Emit(TEXT("heal"), Juno.X, Juno.Z, 4.f); }
	if (E.Kind == EKind::Boss || E.Kind == EKind::Brute) Hitstop = RR::Hitstop * 2.5f;
	Emit(TEXT("kill"), E.X, E.Z, 0, E.Kind);
}

bool FRRSim::HurtJuno(float Amount, float FromX, float FromZ, float Push)
{
	FRRJuno& J = Juno;
	if (J.Iframes > 0 || Phase != ERRPhase::Play) return false;
	J.Hp -= Amount; J.Iframes = JunoIframes;
	const float Dx = J.X - FromX, Dz = J.Z - FromZ, D = FMath::Max(0.01f, FMath::Sqrt(Dx * Dx + Dz * Dz));
	J.Kx += Dx / D * Push * 4.f; J.Kz += Dz / D * Push * 4.f;
	Emit(TEXT("hurt"), J.X, J.Z, Amount);
	if (J.Hp <= 0)
	{
		if (Revives > 0)
		{
			Revives--;
			J.Hp = J.MaxHp * 0.5f; J.Iframes = 2.f;
			for (FRREnemy& E : Enemies) // push everyone away
			{
				const float Ex = E.X - J.X, Ez = E.Z - J.Z, Ed = FMath::Max(0.01f, FMath::Sqrt(Ex * Ex + Ez * Ez));
				if (Ed < 5.f) { E.Kx += Ex / Ed * 25.f; E.Kz += Ez / Ed * 25.f; }
			}
			Emit(TEXT("revive"));
		}
		else
		{
			J.Hp = 0; Phase = ERRPhase::Dead;
			Emit(TEXT("dead"));
		}
	}
	return true;
}

// ---- Crows ------------------------------------------------------------------------------------
void FRRSim::MoveEnemies(float Dt)
{
	FRRJuno& J = Juno;
	const float Decay = FMath::Exp(-8.f * Dt);
	for (FRREnemy& E : Enemies)
	{
		if (E.bDead) { E.DeadT += Dt; continue; }
		const FEnemyDef& D = Def(E.Kind);
		E.Flash = FMath::Max(0.f, E.Flash - Dt); E.HurtT = FMath::Max(0.f, E.HurtT - Dt);
		E.Cd = FMath::Max(0.f, E.Cd - Dt); E.PipeCd = FMath::Max(0.f, E.PipeCd - Dt);
		const float Dx = J.X - E.X, Dz = J.Z - E.Z, Dist = FMath::Max(0.001f, FMath::Sqrt(Dx * Dx + Dz * Dz));
		float Mx = Dx / Dist, Mz = Dz / Dist, Sp = D.Speed;
		if (E.HurtT > 0) Sp *= 0.25f; // flinch

		if (E.Kind == EKind::Thrower)
		{
			// keep a throwing distance and strafe
			if (Dist < ThrowerRange - 1.5f) { Mx = -Mx; Mz = -Mz; }
			else if (Dist < ThrowerRange) { const float T = Mx; Mx = -Mz * E.Strafe; Mz = T * E.Strafe; Sp *= 0.6f; }
			E.ThrowT -= Dt;
			if (E.ThrowT <= 0 && Dist < ThrowerRange + 2.f)
			{
				E.ThrowT = ThrowEvery;
				const float T = FMath::Max(0.3f, Dist / 10.f), Tx = J.X + J.Vx * T * 0.6f, Tz = J.Z + J.Vz * T * 0.6f;
				FRRShot Shot;
				Shot.X = Shot.Px = E.X; Shot.Z = Shot.Pz = E.Z; Shot.Y = Shot.Py = 1.5f;
				Shot.Vx = (Tx - E.X) / T; Shot.Vz = (Tz - E.Z) / T; Shot.Vy = (1.f - 1.5f) / T + 6.f * T;
				Shot.Life = 3.f; Shot.Damage = D.Damage;
				Shots.Add(Shot);
				Emit(TEXT("throw"), E.X, E.Z);
			}
		}
		if (E.Kind == EKind::Boss)
		{
			if (E.Windup > 0)
			{
				E.Windup -= Dt; Sp = 0;
				if (E.Windup <= 0)
				{
					E.SmashT = SmashEvery;
					if (FMath::Sqrt(FMath::Square(J.X - E.X) + FMath::Square(J.Z - E.Z)) < SmashRadius + J.Radius) HurtJuno(D.Damage, E.X, E.Z, 6.f);
					for (FRREnemy& O : Enemies)
						if (&O != &E && !O.bDead && FMath::Sqrt(FMath::Square(O.X - E.X) + FMath::Square(O.Z - E.Z)) < SmashRadius) { O.Kx += (O.X - E.X) * 6.f; O.Kz += (O.Z - E.Z) * 6.f; }
					Hitstop = RR::Hitstop * 2.f;
					Emit(TEXT("smash"), E.X, E.Z, SmashRadius);
				}
			}
			else
			{
				E.SmashT -= Dt;
				if (E.SmashT <= 0 && Dist < SmashRadius + 0.5f) { E.Windup = SmashWindup; Emit(TEXT("windup"), E.X, E.Z, SmashRadius); }
			}
		}

		E.Vx = Mx * Sp; E.Vz = Mz * Sp;
		E.Yaw = Turn(E.Yaw, FMath::Atan2(Dx, Dz), 10.f * Dt);
		E.X += (E.Vx + E.Kx) * Dt; E.Z += (E.Vz + E.Kz) * Dt;
		E.Kx *= Decay; E.Kz *= Decay;
		E.Walk += Dt * (2.f + Sp * 2.2f);

		// contact damage
		if (E.Cd <= 0 && E.Kind != EKind::Boss && Dist < E.Radius + J.Radius + 0.08f)
			if (HurtJuno(D.Damage, E.X, E.Z, 1.6f)) E.Cd = ContactCooldown;
	}
	Separate();
	for (FRREnemy& E : Enemies)
	{
		if (E.bDead) continue;
		KeepOut(E, E.Radius);
		if (Penetration(E.X, E.Z, E.Radius) > 0.01f) { E.X = E.Px; E.Z = E.Pz; E.Kx = E.Kz = 0; }
	}
}

// push overlapping Crows apart, using a grid so 100+ stay cheap
void FRRSim::Separate()
{
	const float Cell = 1.2f;
	TMap<FIntPoint, TArray<int32>> Grid;
	for (int32 i = 0; i < Enemies.Num(); i++)
		if (!Enemies[i].bDead) Grid.FindOrAdd(FIntPoint(FMath::FloorToInt(Enemies[i].X / Cell), FMath::FloorToInt(Enemies[i].Z / Cell))).Add(i);
	FRRJuno& J = Juno;
	for (int32 i = 0; i < Enemies.Num(); i++)
	{
		FRREnemy& E = Enemies[i];
		if (E.bDead) continue;
		const int32 Cx = FMath::FloorToInt(E.X / Cell), Cz = FMath::FloorToInt(E.Z / Cell);
		for (int32 Ix = -1; Ix <= 1; Ix++) for (int32 Iz = -1; Iz <= 1; Iz++)
		{
			const TArray<int32>* List = Grid.Find(FIntPoint(Cx + Ix, Cz + Iz));
			if (!List) continue;
			for (int32 k : *List)
			{
				FRREnemy& O = Enemies[k];
				if (O.Id <= E.Id) continue;
				const float Dx = O.X - E.X, Dz = O.Z - E.Z, D = FMath::Sqrt(Dx * Dx + Dz * Dz), Min = E.Radius + O.Radius;
				if (D >= Min || D < 1e-5f) continue;
				const float Push = (Min - D) / 2, Nx = Dx / D, Nz = Dz / D;
				const float Me = Def(E.Kind).Mass, Mo = Def(O.Kind).Mass, We = Mo / (Me + Mo), Wo = Me / (Me + Mo);
				E.X -= Nx * Push * 2 * We; E.Z -= Nz * Push * 2 * We;
				O.X += Nx * Push * 2 * Wo; O.Z += Nz * Push * 2 * Wo;
			}
		}
		// Crows cannot stand inside Juno (she is pushed a little too), except while she rolls through them
		const float Dx = J.X - E.X, Dz = J.Z - E.Z, D = FMath::Sqrt(Dx * Dx + Dz * Dz), Min = E.Radius + J.Radius;
		if (D < Min && D > 1e-5f && J.RollT <= 0)
		{
			const float Over = Min - D;
			E.X -= Dx / D * Over * 0.8f; E.Z -= Dz / D * Over * 0.8f;
			J.X += Dx / D * Over * 0.2f; J.Z += Dz / D * Over * 0.2f;
		}
	}
	KeepOut(J, J.Radius);
}

// ---- projectiles and pickups -----------------------------------------------------------------------
void FRRSim::Projectiles(float Dt)
{
	FRRJuno& J = Juno;
	for (FRRShot& S : Shots)
	{
		S.Vy -= 12.f * Dt;
		S.X += S.Vx * Dt; S.Y += S.Vy * Dt; S.Z += S.Vz * Dt; S.Life -= Dt;
		if (FMath::Sqrt(FMath::Square(S.X - J.X) + FMath::Square(S.Z - J.Z)) < J.Radius + 0.25f && S.Y < 1.8f) { HurtJuno(S.Damage, S.X - S.Vx, S.Z - S.Vz, 1.2f); S.bDead = true; }
		else if (S.Y <= 0 || S.Life <= 0 || Penetration(S.X, S.Z, 0.05f) > 0) S.bDead = true;
	}
	for (FRRToss& T : Tosses)
	{
		T.X += T.Vx * Dt; T.Z += T.Vz * Dt; T.Life -= Dt;
		for (FRREnemy& E : Enemies)
		{
			if (E.bDead || T.Hit.Contains(E.Id) || FMath::Sqrt(FMath::Square(E.X - T.X) + FMath::Square(E.Z - T.Z)) > E.Radius + 0.3f) continue;
			T.Hit.Add(E.Id);
			Damage(E, (16.f + 4.f * Lv(EUp::Wrench)) * DmgMul(), 1.8f, T.Vx / 13.f, T.Vz / 13.f, TEXT("wrench"));
			if (T.Hit.Num() >= T.Pierce) { T.bDead = true; break; }
		}
		if (T.Life <= 0 || Penetration(T.X, T.Z, 0.05f) > 0) T.bDead = true;
	}
}

void FRRSim::Pickups(float Dt)
{
	FRRJuno& J = Juno;
	const float Mag = MagnetR();
	for (FRRCoin& C : Coins)
	{
		C.Age += Dt;
		if (C.Y > 0 || C.Vy > 0)
		{
			C.Vy -= 18.f * Dt; C.Y += C.Vy * Dt;
			if (C.Y <= 0) { C.Y = 0; C.Vy = C.Vy < -2.f ? -C.Vy * 0.3f : 0; C.Vx *= 0.4f; C.Vz *= 0.4f; }
		}
		else { const float F = FMath::Exp(-6.f * Dt); C.Vx *= F; C.Vz *= F; }
		C.X += C.Vx * Dt; C.Z += C.Vz * Dt;
		const float Dx = J.X - C.X, Dz = J.Z - C.Z, D = FMath::Sqrt(Dx * Dx + Dz * Dz);
		if (C.Age > 0.3f && D < Mag && D > 0.01f)
		{
			const float StepLen = FMath::Min(D, (MagnetSpeed + (Mag - D) * 3.f) * Dt);
			C.X += Dx / D * StepLen; C.Z += Dz / D * StepLen;
		}
		KeepOut(C, 0.12f);
		if (C.Age > 0.3f && FMath::Sqrt(FMath::Square(J.X - C.X) + FMath::Square(J.Z - C.Z)) < Pickup)
		{
			C.bDead = true;
			if (C.Heal > 0) { J.Hp = FMath::Min(J.MaxHp, J.Hp + C.Heal); Emit(TEXT("heal"), J.X, J.Z, C.Heal); continue; }
			J.Xp += C.Value;
			Bank += C.Value * CoinMul();
			Emit(TEXT("coin"));
		}
	}
	while (J.Xp >= J.XpNeed)
	{
		J.Xp -= J.XpNeed; J.Level++;
		J.XpNeed = XpFirst + XpPerLevel * (J.Level - 1);
		PendingLevels++;
	}
	if (PendingLevels > 0 && Phase == ERRPhase::Play) OfferLevelUp();
}

void FRRSim::OfferLevelUp()
{
	TArray<EUp> Open;
	for (int32 i = 0; i < (int32)EUp::Count; i++) if (Juno.Ups[i] < 5) Open.Add((EUp)i);
	Choices.Reset();
	while (Choices.Num() < 3 && Open.Num()) { const int32 P = FMath::RandRange(0, Open.Num() - 1); Choices.Add(Open[P]); Open.RemoveAt(P); }
	if (!Choices.Num()) Choices.Add(EUp::Heal);
	Phase = ERRPhase::LevelUp;
	Emit(TEXT("levelup"), 0, 0, (float)Juno.Level);
}

void FRRSim::Choose(EUp Key)
{
	if (Phase != ERRPhase::LevelUp) return;
	if (Key == EUp::Heal) Juno.Hp = FMath::Min(Juno.MaxHp, Juno.Hp + 30.f);
	else
	{
		Juno.Ups[(int32)Key]++;
		if (Key == EUp::IronSkin) { Juno.MaxHp += 20.f; Juno.Hp = FMath::Min(Juno.MaxHp, Juno.Hp + 20.f); }
	}
	PendingLevels--;
	Choices.Reset();
	Phase = ERRPhase::Play;
	Emit(TEXT("chose"));
	if (PendingLevels > 0) OfferLevelUp();
}

void FRRSim::Cleanup()
{
	Enemies.RemoveAll([](const FRREnemy& E) { return E.bDead && E.DeadT > 0.6f; });
	Coins.RemoveAll([](const FRRCoin& C) { return C.bDead; });
	Shots.RemoveAll([](const FRRShot& S) { return S.bDead; });
	Tosses.RemoveAll([](const FRRToss& T) { return T.bDead; });
}

float FRRSim::Penetration(float X, float Z, float R) const
{
	float Pen = FMath::Max3(0.f, FMath::Abs(X) + R - (ArenaWidth / 2 - WallThickness), FMath::Abs(Z) + R - (ArenaDepth / 2 - WallThickness));
	for (const FRRSolid& S : Solids)
	{
		if (S.bCircle) Pen = FMath::Max(Pen, S.R + R - FMath::Sqrt(FMath::Square(X - S.X) + FMath::Square(Z - S.Z)));
		else
		{
			const float Cx = FMath::Clamp(X, S.X - S.Hx, S.X + S.Hx), Cz = FMath::Clamp(Z, S.Z - S.Hz, S.Z + S.Hz);
			Pen = FMath::Max(Pen, R - FMath::Sqrt(FMath::Square(X - Cx) + FMath::Square(Z - Cz)));
		}
	}
	return Pen;
}
