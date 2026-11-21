#include "RRArena.h"
#include "RRHUD.h"
#include "RRSaveGame.h"
#include "Camera/CameraComponent.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/GameViewportClient.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
#include "InputCoreTypes.h"

using namespace RR;

namespace
{
	const float Step = 1.f / 60.f; // fixed gameplay steps; drawing interpolates between them
	float Lerp(float A, float B, float T) { return A + (B - A) * T; }
	float YawToUnreal(float SimYaw) { return 180.f - FMath::RadiansToDegrees(SimYaw); }
}

ARRArena::ARRArena()
{
	PrimaryActorTick.bCanEverTick = true;
	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;
	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	Camera->SetupAttachment(Root);
	// fixed exposure: the comic colours should not drift as the camera moves
	Camera->PostProcessSettings.bOverride_AutoExposureMinBrightness = true;
	Camera->PostProcessSettings.bOverride_AutoExposureMaxBrightness = true;
	Camera->PostProcessSettings.AutoExposureMinBrightness = 1.f;
	Camera->PostProcessSettings.AutoExposureMaxBrightness = 1.f;

	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	static ConstructorHelpers::FObjectFinder<UMaterialInterface> Material(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	CubeMesh = Cube.Object; SphereMesh = Sphere.Object; CylinderMesh = Cylinder.Object; BaseMaterial = Material.Object;
}

// ---- building the scene from basic shapes ---------------------------------------------------
UMaterialInterface* ARRArena::Mat(const TCHAR* Hex)
{
	UMaterialInstanceDynamic* M = UMaterialInstanceDynamic::Create(BaseMaterial, this);
	M->SetVectorParameterValue(TEXT("Color"), FLinearColor(FColor::FromHex(Hex)));
	return M;
}

UStaticMeshComponent* ARRArena::AddStatic(UStaticMesh* Mesh, const FVector& Loc, const FVector& Scale, const TCHAR* Hex, const FRotator& Rot, bool bShadow)
{
	UStaticMeshComponent* C = NewObject<UStaticMeshComponent>(this);
	C->SetupAttachment(Root);
	C->SetStaticMesh(Mesh);
	C->SetMaterial(0, Mat(Hex));
	C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	C->SetCastShadow(bShadow);
	C->SetRelativeTransform(FTransform(Rot, Loc, Scale));
	C->RegisterComponent();
	return C;
}

UInstancedStaticMeshComponent* ARRArena::AddISM(UStaticMesh* Mesh, int32 Capacity, const TCHAR* Hex, bool bShadow)
{
	UInstancedStaticMeshComponent* C = NewObject<UInstancedStaticMeshComponent>(this);
	C->SetupAttachment(Root);
	C->SetStaticMesh(Mesh);
	C->SetMaterial(0, Mat(Hex));
	C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	C->SetCastShadow(bShadow);
	C->SetMobility(EComponentMobility::Movable);
	C->RegisterComponent();
	const FTransform Hidden(FRotator::ZeroRotator, FVector(0, 0, -100000), FVector(0.001f));
	for (int32 i = 0; i < Capacity; i++) C->AddInstance(Hidden);
	return C;
}

void ARRArena::BuildRoof()
{
	const float W = ArenaWidth, D = ArenaDepth;
	// roof slab and the building under it (the basic cube is 1 m, so scale = metres)
	AddStatic(CubeMesh, ToWorld(0, 0, -0.25f), FVector(D, W, 0.5f), TEXT("8d8a86"));
	AddStatic(CubeMesh, ToWorld(0, 0, -6.5f), FVector(D, W, 12.f), TEXT("5b4f6c"));
	// tar seams every 2 m
	for (float X = -W / 2 + 2; X < W / 2; X += 2) AddStatic(CubeMesh, ToWorld(X, 0, 0.005f), FVector(D, 0.05f, 0.01f), TEXT("6e6b68"), FRotator::ZeroRotator, false);
	for (float Z = -D / 2 + 2; Z < D / 2; Z += 2) AddStatic(CubeMesh, ToWorld(0, Z, 0.005f), FVector(0.05f, W, 0.01f), TEXT("6e6b68"), FRotator::ZeroRotator, false);
	// brick parapet with a light cap
	const float T = WallThickness, H = WallHeight;
	struct FWall { float X, Z, Sx, Sz; } Walls[] = { { 0, -D / 2 + T / 2, W, T }, { 0, D / 2 - T / 2, W, T }, { -W / 2 + T / 2, 0, T, D }, { W / 2 - T / 2, 0, T, D } };
	for (const FWall& Wl : Walls)
	{
		AddStatic(CubeMesh, ToWorld(Wl.X, Wl.Z, H / 2), FVector(Wl.Sz, Wl.Sx, H), TEXT("9b4a3c"));
		AddStatic(CubeMesh, ToWorld(Wl.X, Wl.Z, H), FVector(Wl.Sz + 0.06f, Wl.Sx + 0.06f, 0.08f), TEXT("c9bca8"));
	}
	// props, from the simulation's solid list so what you see is what blocks you
	for (const FRRSolid& S : Sim.Solids)
	{
		if (S.Id == TEXT("water_tank"))
		{
			for (int32 i = 0; i < 4; i++)
			{
				const float Lx = S.X + (i % 2 ? 0.6f : -0.6f), Lz = S.Z + (i / 2 ? 0.6f : -0.6f);
				AddStatic(CubeMesh, ToWorld(Lx, Lz, 0.45f), FVector(0.14f, 0.14f, 0.9f), TEXT("3d4f5e"));
			}
			AddStatic(CylinderMesh, ToWorld(S.X, S.Z, 1.52f), FVector(2.f, 2.f, 1.25f), TEXT("6f8fa6"));
			AddStatic(CylinderMesh, ToWorld(S.X, S.Z, 2.3f), FVector(1.2f, 1.2f, 0.3f), TEXT("3d4f5e"));
		}
		else if (S.Id == TEXT("crate"))
		{
			AddStatic(CubeMesh, ToWorld(S.X, S.Z, 0.5f), FVector(1.f), TEXT("c0813f"), FRotator(0, YawToUnreal(S.Yaw), 0));
			AddStatic(CubeMesh, ToWorld(S.X, S.Z, 0.5f), FVector(1.02f, 1.02f, 0.12f), TEXT("7a4d22"), FRotator(0, YawToUnreal(S.Yaw), 0), false);
		}
		else if (S.Id == TEXT("lamp_post"))
		{
			AddStatic(CylinderMesh, ToWorld(S.X, S.Z, 1.65f), FVector(0.14f, 0.14f, 3.3f), TEXT("2c2f38"));
			AddStatic(CubeMesh, ToWorld(S.X, S.Z, 3.4f), FVector(0.3f, 0.3f, 0.2f), TEXT("ffd27a"));
		}
	}
	// neighbouring rooftops lower down, and the street far below
	AddStatic(CubeMesh, ToWorld(0, 0, -16.5f), FVector(260, 260, 1), TEXT("1b1530"), FRotator::ZeroRotator, false);
	FRandomStream Rng(11);
	const TCHAR* Tones[] = { TEXT("5b4f6c"), TEXT("4a4060"), TEXT("6a5878"), TEXT("3f3652") };
	for (int32 Ringi = 0; Ringi < 2; Ringi++)
		for (int32 k = 0; k < 23; k++)
		{
			const float A = (float)k / 23 * 2 * PI + Ringi * 0.13f;
			const float Rx = W / 2 + 7 + Ringi * 12 + Rng.FRand() * 4, Rz = D / 2 + 7 + Ringi * 12 + Rng.FRand() * 4;
			const float Bw = 7 + Rng.FRand() * 6, Bd = 7 + Rng.FRand() * 6, Top = -2.5f - Ringi * 3 - Rng.FRand() * 5;
			AddStatic(CubeMesh, ToWorld(FMath::Cos(A) * Rx, FMath::Sin(A) * Rz, (Top - 16) / 2), FVector(Bd, Bw, Top + 16), Tones[Rng.RandRange(0, 3)], FRotator::ZeroRotator, false);
		}
}

void ARRArena::BuildLooks()
{
	// colours: jacket, skin, legs, visor
	struct FLookDef { const TCHAR* Body; const TCHAR* Skin; const TCHAR* Legs; const TCHAR* Visor; int32 Capacity; };
	const FLookDef Defs[] = {
		{ TEXT("2fb6a8"), TEXT("e8b48a"), TEXT("27324a"), TEXT("111111"), 1 },   // Juno
		{ Def(EKind::Grunt).Hex, TEXT("c9a27e"), TEXT("23262e"), TEXT("d7e0f0"), 120 },
		{ Def(EKind::Runner).Hex, TEXT("c9a27e"), TEXT("23262e"), TEXT("d7e0f0"), 60 },
		{ Def(EKind::Thrower).Hex, TEXT("c9a27e"), TEXT("23262e"), TEXT("d7e0f0"), 40 },
		{ Def(EKind::Brute).Hex, TEXT("c9a27e"), TEXT("1f2028"), TEXT("5a5f6b"), 40 },
		{ Def(EKind::Boss).Hex, TEXT("b98c6a"), TEXT("1f2028"), TEXT("f0c040"), 3 },
	};
	// name-free part table (centimetres for a 1.7 m person; the character faces +X)
	struct FPartDef { int32 Shape; FVector Pivot, Offset, Scale; int32 Role, Limb; };
	const FPartDef Parts[] = {
		{ 0, FVector(0, -11, 80), FVector(0, 0, -40), FVector(0.19f, 0.17f, 0.8f), 0, 1 },  // left leg
		{ 0, FVector(0, 11, 80), FVector(0, 0, -40), FVector(0.19f, 0.17f, 0.8f), 0, 2 },   // right leg
		{ 0, FVector(0, 0, 80), FVector(0, 0, 30), FVector(0.26f, 0.4f, 0.6f), 1, 0 },      // torso
		{ 1, FVector(0, 0, 80), FVector(0, 0, 70), FVector(0.3f, 0.3f, 0.32f), 2, 0 },      // head
		{ 0, FVector(0, 0, 80), FVector(13, 0, 73), FVector(0.08f, 0.24f, 0.07f), 3, 0 },   // visor (shows which way it faces)
		{ 0, FVector(0, -29, 128), FVector(0, 0, -28), FVector(0.11f, 0.11f, 0.56f), 1, 3 },// left arm
		{ 0, FVector(0, 29, 128), FVector(0, 0, -28), FVector(0.11f, 0.11f, 0.56f), 1, 4 }, // right arm
	};
	for (const FLookDef& L : Defs)
	{
		FRRLook Look; Look.Capacity = L.Capacity;
		for (const FPartDef& P : Parts)
		{
			const TCHAR* Hex = P.Role == 0 ? L.Legs : P.Role == 1 ? L.Body : P.Role == 2 ? L.Skin : L.Visor;
			FRRPart Part;
			Part.Mesh = AddISM(P.Shape == 0 ? CubeMesh : SphereMesh, L.Capacity, Hex);
			Part.Pivot = P.Pivot; Part.Offset = P.Offset; Part.Scale = P.Scale; Part.Role = P.Role; Part.Limb = P.Limb;
			Look.Parts.Add(Part);
		}
		Looks.Add(Look);
	}
}

void ARRArena::BeginPlay()
{
	Super::BeginPlay();
	Save = URRSaveGame::LoadOrCreate();
	FRRShop Shop;
	for (int32 i = 0; i < (int32)EShop::Count; i++) Shop.Level[i] = Save ? Save->ShopLevel(i) : 0;
	Sim.Reset(Shop);

	// one main light that casts shadows, a soft fill, and dusk-coloured haze for the sky
	UDirectionalLightComponent* Sun = NewObject<UDirectionalLightComponent>(this);
	Sun->SetupAttachment(Root); Sun->SetMobility(EComponentMobility::Movable);
	Sun->SetIntensity(6.f); Sun->SetLightColor(FLinearColor(FColor::FromHex(TEXT("ffe2c0"))));
	Sun->SetRelativeRotation(FRotator(-50.f, 35.f, 0.f)); Sun->SetCastShadows(true);
	Sun->RegisterComponent();
	UDirectionalLightComponent* Fill = NewObject<UDirectionalLightComponent>(this);
	Fill->SetupAttachment(Root); Fill->SetMobility(EComponentMobility::Movable);
	Fill->SetIntensity(2.f); Fill->SetLightColor(FLinearColor(FColor::FromHex(TEXT("b9a6ff"))));
	Fill->SetRelativeRotation(FRotator(-70.f, -150.f, 0.f)); Fill->SetCastShadows(false);
	Fill->RegisterComponent();
	UExponentialHeightFogComponent* Fog = NewObject<UExponentialHeightFogComponent>(this);
	Fog->SetupAttachment(Root);
	Fog->SetFogInscatteringColor(FLinearColor(FColor::FromHex(TEXT("8a4f6e"))));
	Fog->SetFogDensity(0.02f);
	Fog->RegisterComponent();

	BuildRoof();
	BuildLooks();
	Coins = AddISM(CylinderMesh, 300, TEXT("ffc93c"), false);
	Cans = AddISM(CylinderMesh, 40, TEXT("e0342c"));
	Wrenches = AddISM(CubeMesh, 64, TEXT("c4ccd6"));
	Pipes = AddISM(CylinderMesh, 4, TEXT("9aa5b1"));
	Sparks = AddISM(CubeMesh, 60, TEXT("ffe14d"), false);
	Ring = AddISM(CubeMesh, 32, TEXT("7fe0ff"), false);
	WarnFill = AddISM(CylinderMesh, 1, TEXT("ff4a4a"), false);
	JunoMarker = AddStatic(CylinderMesh, FVector::ZeroVector, FVector(0.95f, 0.95f, 0.02f), TEXT("ffd23f"), FRotator::ZeroRotator, false);
	SparkList.SetNum(60);
	Screen = ERRScreen::Title;
}

ARRHUD* ARRArena::GetHUD() const
{
	APlayerController* PC = GetWorld() ? GetWorld()->GetFirstPlayerController() : nullptr;
	return PC ? Cast<ARRHUD>(PC->GetHUD()) : nullptr;
}

// ---- screens --------------------------------------------------------------------------------
void ARRArena::StartRun()
{
	FRRShop Shop;
	for (int32 i = 0; i < (int32)EShop::Count; i++) Shop.Level[i] = Save ? Save->ShopLevel(i) : 0;
	Sim.Reset(Shop);
	Sim.Events.Reset();
	Input = FRRInput();
	Acc = 0; ResultsTimer = -1;
	Screen = ERRScreen::Run;
	if (ARRHUD* H = GetHUD()) H->Banner(TEXT("HOLD THE ROOF!"), 1.4f);
}

void ARRArena::FinishRun(bool bWon)
{
	bLastWon = bWon;
	LastEarned = FMath::FloorToInt(Sim.Bank);
	bNewBest = Save && Sim.Time > Save->Best + 0.5f;
	if (Save)
	{
		Save->Bank += LastEarned;
		Save->Best = FMath::Max(Save->Best, Sim.Time);
		Save->BestKills = FMath::Max(Save->BestKills, Sim.Kills);
		if (bWon) Save->Wins++;
		Save->Store();
	}
	Screen = ERRScreen::Results;
}

void ARRArena::OnButton(FName Id, int32 Param)
{
	if (Id == TEXT("play") || Id == TEXT("again")) StartRun();
	else if (Id == TEXT("shop")) { ShopReturn = Screen; Screen = ERRScreen::Shop; }
	else if (Id == TEXT("shop_close")) Screen = ShopReturn;
	else if (Id == TEXT("pause") && Screen == ERRScreen::Run) Screen = ERRScreen::Paused;
	else if (Id == TEXT("resume") && Screen == ERRScreen::Paused) Screen = ERRScreen::Run;
	else if (Id == TEXT("quit")) { Sim.Phase = ERRPhase::Dead; FinishRun(false); }
	else if (Id == TEXT("roll")) Input.Roll++;
	else if (Id == TEXT("card") && Screen == ERRScreen::LevelUp && Sim.Choices.IsValidIndex(Param))
	{
		Sim.Choose(Sim.Choices[Param]);
		if (Sim.Phase == ERRPhase::Play) Screen = ERRScreen::Run;
	}
	else if (Id == TEXT("buy") && Save)
	{
		const FShopDef& D = ShopDef((EShop)Param);
		const int32 L = Save->ShopLevel(Param);
		if (L < D.Costs.Num() && Save->Bank >= D.Costs[L]) { Save->Bank -= D.Costs[L]; Save->Shop[Param] = L + 1; Save->Store(); }
	}
}

// ---- input: one thumb anywhere steers; the ROLL button (or Space/Shift/K) rolls -------------------
void ARRArena::ReadInput(float Dt)
{
	APlayerController* PC = GetWorld()->GetFirstPlayerController();
	ARRHUD* Hud = GetHUD();
	if (!PC) return;

	float Mx = (PC->IsInputKeyDown(EKeys::D) || PC->IsInputKeyDown(EKeys::Right) ? 1.f : 0.f) - (PC->IsInputKeyDown(EKeys::A) || PC->IsInputKeyDown(EKeys::Left) ? 1.f : 0.f);
	float Mz = (PC->IsInputKeyDown(EKeys::S) || PC->IsInputKeyDown(EKeys::Down) ? 1.f : 0.f) - (PC->IsInputKeyDown(EKeys::W) || PC->IsInputKeyDown(EKeys::Up) ? 1.f : 0.f);
	if (PC->WasInputKeyJustPressed(EKeys::SpaceBar) || PC->WasInputKeyJustPressed(EKeys::LeftShift) || PC->WasInputKeyJustPressed(EKeys::K)) Input.Roll++;
	if (PC->WasInputKeyJustPressed(EKeys::Escape)) OnButton(Screen == ERRScreen::Paused ? FName(TEXT("resume")) : FName(TEXT("pause")), 0);

	FVector2D ViewSize(1080, 1920);
	if (GEngine && GEngine->GameViewport) GEngine->GameViewport->GetViewportSize(ViewSize);
	const float StickMax = ViewSize.Y * 0.06f;
	const ETouchIndex::Type Fingers[3] = { ETouchIndex::Touch1, ETouchIndex::Touch2, ETouchIndex::Touch3 };
	for (int32 f = 0; f < 3; f++)
	{
		float X = 0, Y = 0; bool bDown = false;
		PC->GetInputTouchState(Fingers[f], X, Y, bDown);
		if (bDown && !bPrevDown[f])
		{
			FName Id; int32 Param = 0;
			if (Hud && Hud->HitTest(FVector2D(X, Y), Id, Param)) OnButton(Id, Param); // a button takes the touch
			else if (StickFinger < 0 && Screen == ERRScreen::Run) { StickFinger = f; StickOrigin = FVector2D(X, Y); StickVec = FVector2D::ZeroVector; }
		}
		if (bDown && f == StickFinger)
		{
			FVector2D D = FVector2D(X, Y) - StickOrigin;
			const float Len = D.Size();
			if (Len > StickMax) { StickOrigin += D / Len * (Len - StickMax); D = D / Len * StickMax; } // the stick follows the thumb
			StickVec = D / StickMax;
		}
		if (!bDown && bPrevDown[f] && f == StickFinger) { StickFinger = -1; StickVec = FVector2D::ZeroVector; }
		bPrevDown[f] = bDown;
	}
	Mx += StickVec.X; Mz += StickVec.Y; // screen down = south (+z, toward the camera)
	const float M = FMath::Sqrt(Mx * Mx + Mz * Mz);
	Input.Mx = M > 1 ? Mx / M : Mx; Input.Mz = M > 1 ? Mz / M : Mz;
	if (Hud) { Hud->bStickActive = StickFinger >= 0; Hud->StickOrigin = StickOrigin; Hud->StickVec = StickVec; Hud->StickMax = StickMax; }
}

// ---- events from the simulation: screens, words, shakes, sparks --------------------------------
void ARRArena::Burst(const FVector& P, int32 N, float Speed)
{
	for (FSpark& S : SparkList)
	{
		if (N <= 0) break;
		if (S.Life > 0) continue;
		const float A = FMath::FRand() * 2 * PI, Sp = Speed * (0.5f + FMath::FRand());
		S.P = P; S.V = FVector(FMath::Cos(A) * Sp, FMath::Sin(A) * Sp, 150.f + FMath::FRand() * 300.f); S.Life = 0.3f;
		N--;
	}
}

void ARRArena::HandleEvents()
{
	ARRHUD* Hud = GetHUD();
	static const TCHAR* Ko[] = { TEXT("POW!"), TEXT("BONK!"), TEXT("WHAM!"), TEXT("KA-POW!"), TEXT("SMACK!") };
	static float KillPopT = -10;
	for (const FRREvent& E : Sim.Events)
	{
		const FVector P = ToWorld(E.X, E.Z, 1.f);
		if (E.Type == TEXT("hit")) Burst(P, E.Source == TEXT("kick") ? 5 : 3, 300.f);
		else if (E.Type == TEXT("swing")) { if (E.Amount > 0 && E.Source == TEXT("kick")) Shake = FMath::Max(Shake, 0.12f); }
		else if (E.Type == TEXT("kill"))
		{
			const bool bBig = E.Kind == EKind::Boss || E.Kind == EKind::Brute;
			Burst(P, E.Kind == EKind::Boss ? 30 : bBig ? 14 : 6, bBig ? 600.f : 350.f);
			if (bBig) Shake = FMath::Max(Shake, 0.3f);
			if (Hud && (bBig || Sim.Time - KillPopT > 0.6f)) { KillPopT = Sim.Time; Hud->Pop(ToWorld(E.X, E.Z, 1.8f), Ko[FMath::RandRange(0, 4)], bBig ? 2 : 0); }
			if (E.Kind == EKind::Boss && Hud) Hud->Banner(TEXT("GRUDGE IS DOWN!"), 1.6f);
		}
		else if (E.Type == TEXT("hurt")) { Shake = FMath::Max(Shake, 0.16f); HurtFlash = 1; if (Hud) Hud->Pop(ToWorld(Sim.Juno.X, Sim.Juno.Z, 2.1f), FString::Printf(TEXT("-%d"), FMath::RoundToInt(E.Amount)), 1); }
		else if (E.Type == TEXT("heal")) { if (Hud) Hud->Pop(ToWorld(Sim.Juno.X, Sim.Juno.Z, 2.1f), FString::Printf(TEXT("+%d"), FMath::RoundToInt(E.Amount)), 3); }
		else if (E.Type == TEXT("stomp")) { StompT = 0.35f; StompR = E.Amount; StompX = E.X; StompZ = E.Z; Shake = FMath::Max(Shake, 0.12f); }
		else if (E.Type == TEXT("smash")) { Shake = FMath::Max(Shake, 0.36f); Burst(ToWorld(E.X, E.Z, 0.3f), 20, 600.f); }
		else if (E.Type == TEXT("roll")) Burst(ToWorld(E.X, E.Z, 0.15f), 6, 200.f);
		else if (E.Type == TEXT("boss")) { if (Hud) Hud->Banner(E.Amount >= 3 ? TEXT("GRUDGE IS BACK - LAST TIME!") : TEXT("BOSS: GRUDGE!"), 1.6f); }
		else if (E.Type == TEXT("revive")) { if (Hud) Hud->Banner(TEXT("BACK ON YOUR FEET!"), 1.6f); }
		else if (E.Type == TEXT("levelup")) Screen = ERRScreen::LevelUp;
		else if (E.Type == TEXT("dead")) ResultsTimer = 1.2f;
		else if (E.Type == TEXT("won")) { ResultsTimer = 2.2f; if (Hud) Hud->Banner(TEXT("ROOF HELD!"), 2.5f); }
	}
	Sim.Events.Reset();
}

// ---- every frame --------------------------------------------------------------------------------
void ARRArena::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	const float Dt = FMath::Min(DeltaSeconds, 0.1f);
	Clock += Dt;
	ReadInput(Dt);

	if (Screen == ERRScreen::Run)
	{
		Acc += Dt;
		int32 N = 0;
		while (Acc >= Step && N < 12) { Sim.Step(Step, Input); Acc -= Step; N++; }
		if (Acc > Step * 4) Acc = 0;
	}
	HandleEvents();
	if (ResultsTimer > 0 && (ResultsTimer -= Dt) <= 0) FinishRun(Sim.Phase == ERRPhase::Won);
	Draw(FMath::Min(1.f, Acc / Step), Dt);
}

void ARRArena::DrawLook(FRRLook& Look)
{
	const FTransform Hidden(FRotator::ZeroRotator, FVector(0, 0, -100000), FVector(0.001f));
	for (FRRPart& Part : Look.Parts)
	{
		TArray<FTransform> Xf;
		Xf.Init(Hidden, Look.Capacity);
		for (int32 i = 0; i < Look.Poses.Num() && i < Look.Capacity; i++)
		{
			const FRRPose& P = Look.Poses[i];
			if (!P.bVisible) continue;
			float Swing = 0;
			if (Part.Limb == 1) Swing = P.LegL; else if (Part.Limb == 2) Swing = P.LegR; else if (Part.Limb == 3) Swing = P.ArmL; else if (Part.Limb == 4) Swing = P.ArmR;
			const FTransform Base(FRotator(P.BodyPitch, P.YawDeg, 0), P.Pos + FVector(0, 0, P.Lift), FVector(P.Scale));
			const FTransform Hinge(FRotator(Swing, 0, 0), Part.Pivot);
			const FTransform Mesh(FRotator::ZeroRotator, Part.Offset, Part.Scale);
			Xf[i] = Mesh * Hinge * Base;
		}
		Part.Mesh->BatchUpdateInstancesTransforms(0, Xf, false, true, true);
	}
	Look.Poses.Reset();
}

void ARRArena::Draw(float Alpha, float Dt)
{
	const FRRJuno& J = Sim.Juno;
	const float Jx = Lerp(J.Px, J.X, Alpha), Jz = Lerp(J.Pz, J.Z, Alpha);

	// Juno: guard, run cycle, punches, kick, somersault roll, knocked out, cheering
	{
		FRRPose P; P.Pos = ToWorld(Jx, Jz); P.YawDeg = YawToUnreal(J.Yaw); P.Scale = 1.f;
		Stride += J.SpeedNow * Dt * 2.4f;
		const float S = FMath::Sin(Stride), Amp = FMath::Min(1.f, J.SpeedNow / 3.f) * 45.f;
		P.LegL = S * Amp; P.LegR = -S * Amp; P.ArmL = 45.f - S * Amp * 0.3f; P.ArmR = 45.f + S * Amp * 0.3f;
		P.BodyPitch = -(3.f + Amp * 0.15f);
		if (J.Swing > 0)
		{
			const float K = FMath::Sin((1.f - J.Swing / 0.22f) * PI);
			if (J.SwingChain == 0) P.ArmL = 45.f + 50.f * K; else if (J.SwingChain == 1) P.ArmR = 45.f + 50.f * K; else P.LegR = 80.f * K;
		}
		if (J.RollT > 0)
		{
			const float K = 1.f - J.RollT / RollTime;
			P.BodyPitch = -360.f * K; P.Lift = (FMath::Sin(K * PI) * 0.35f + 0.35f) * 100.f;
			P.ArmL = P.ArmR = 140.f; P.LegL = P.LegR = 90.f;
		}
		if (Sim.Phase == ERRPhase::Dead) { P.BodyPitch = 85.f; P.Lift = 12.f; }
		if (Sim.Phase == ERRPhase::Won) { P.ArmL = P.ArmR = 170.f; P.Lift = FMath::Abs(FMath::Sin(Clock * 6.f)) * 20.f; }
		P.bVisible = J.RollT > 0 || !(J.Iframes > 0 && FMath::FloorToInt(Clock * 16.f) % 2 == 0);
		Looks[0].Poses.Add(P);
		JunoMarker->SetRelativeLocation(ToWorld(Jx, Jz, 0.012f));
	}

	// the swarm
	for (const FRREnemy& E : Sim.Enemies)
	{
		const FEnemyDef& D = Def(E.Kind);
		FRRPose P; P.Pos = ToWorld(Lerp(E.Px, E.X, Alpha), Lerp(E.Pz, E.Z, Alpha)); P.YawDeg = YawToUnreal(E.Yaw);
		P.Scale = D.Scale * (E.Flash > 0 ? 1.08f : 1.f);
		const float Swing = E.bDead ? 0.f : FMath::Sin(E.Walk) * 40.f;
		P.LegL = Swing; P.LegR = -Swing; P.ArmL = 30.f - Swing * 0.6f; P.ArmR = 30.f + Swing * 0.6f;
		if (E.Kind == EKind::Thrower && E.ThrowT < 0.5f) P.ArmR = 150.f;
		if (E.Windup > 0) { P.ArmL = P.ArmR = 170.f; P.BodyPitch = 25.f; } // Grudge rears back before the smash
		if (E.HurtT > 0) P.BodyPitch = 20.f;
		if (E.bDead)
		{
			P.BodyPitch = 90.f * FMath::Min(1.f, E.DeadT / 0.25f);
			P.Scale *= 1.f - FMath::Max(0.f, (E.DeadT - 0.3f) / 0.3f) * 0.6f;
		}
		Looks[1 + (int32)E.Kind].Poses.Add(P);
	}
	for (FRRLook& L : Looks) DrawLook(L);

	// coins, soda cans, wrenches, pipes
	const FTransform Hidden(FRotator::ZeroRotator, FVector(0, 0, -100000), FVector(0.001f));
	{
		TArray<FTransform> C; C.Init(Hidden, 300);
		TArray<FTransform> H; H.Init(Hidden, 40);
		int32 Nc = 0, Nh = 0;
		for (const FRRCoin& Co : Sim.Coins)
		{
			const FVector Pos = ToWorld(Lerp(Co.Px, Co.X, Alpha), Lerp(Co.Pz, Co.Z, Alpha), Lerp(Co.Py, Co.Y, Alpha));
			if (Co.Heal > 0) { if (Nh < 40) H[Nh++] = FTransform(FRotator(0, Clock * 120.f, 0), Pos + FVector(0, 0, 22.f + FMath::Sin(Clock * 4.f + Nh) * 6.f), FVector(0.26f, 0.26f, 0.34f)); }
			else if (Nc < 300) { const float S = 0.28f * (0.8f + FMath::Min(1.2f, Co.Value * 0.25f)); C[Nc++] = FTransform(FRotator(0, Clock * 280.f + Nc * 20.f, 90.f), Pos + FVector(0, 0, 16.f), FVector(S, S, 0.04f)); }
		}
		Coins->BatchUpdateInstancesTransforms(0, C, false, true, true);
		Cans->BatchUpdateInstancesTransforms(0, H, false, true, true);

		TArray<FTransform> W; W.Init(Hidden, 64);
		int32 Nw = 0;
		for (const FRRShot& S : Sim.Shots) if (Nw < 64) W[Nw++] = FTransform(FRotator(Clock * 700.f, Clock * 800.f, 0), ToWorld(Lerp(S.Px, S.X, Alpha), Lerp(S.Pz, S.Z, Alpha), Lerp(S.Py, S.Y, Alpha)), FVector(0.34f, 0.1f, 0.06f));
		for (const FRRToss& T : Sim.Tosses) if (Nw < 64) W[Nw++] = FTransform(FRotator(0, Clock * 800.f, 0), ToWorld(Lerp(T.Px, T.X, Alpha), Lerp(T.Pz, T.Z, Alpha), 1.f), FVector(0.34f, 0.1f, 0.06f));
		Wrenches->BatchUpdateInstancesTransforms(0, W, false, true, true);

		TArray<FTransform> Pp; Pp.Init(Hidden, 4);
		const int32 NPipes = FMath::Min(4, Sim.Lv(EUp::Pipes));
		for (int32 i = 0; i < NPipes; i++)
		{
			const float A = J.PipeAngle + (float)i / NPipes * 2 * PI;
			Pp[i] = FTransform(FRotator(90.f, YawToUnreal(A + HALF_PI), 0), ToWorld(Jx + FMath::Sin(A) * 1.9f, Jz + FMath::Cos(A) * 1.9f, 1.f), FVector(0.08f, 0.08f, 0.9f));
		}
		Pipes->BatchUpdateInstancesTransforms(0, Pp, false, true, true);
	}

	// stomp shockwave (a ring of blocks growing out) and the boss warning (a red disc filling up)
	{
		TArray<FTransform> R; R.Init(Hidden, 32);
		StompT = FMath::Max(0.f, StompT - Dt);
		const FRREnemy* Boss = nullptr;
		for (const FRREnemy& E : Sim.Enemies) if (E.Kind == EKind::Boss && E.Windup > 0 && !E.bDead) Boss = &E;
		if (StompT > 0 || Boss)
		{
			const float K = Boss ? 1.f : 1.f - StompT / 0.35f;
			const float Rad = Boss ? SmashRadius : 0.3f + StompR * K;
			const float Cx = Boss ? Boss->X : StompX, Cz = Boss ? Boss->Z : StompZ;
			for (int32 i = 0; i < 32; i++)
			{
				const float A = (float)i / 32 * 2 * PI;
				R[i] = FTransform(FRotator(0, YawToUnreal(A), 0), ToWorld(Cx + FMath::Sin(A) * Rad, Cz + FMath::Cos(A) * Rad, 0.04f), FVector(0.12f, Rad * 0.2f, 0.04f));
			}
		}
		Ring->BatchUpdateInstancesTransforms(0, R, false, true, true);
		TArray<FTransform> F; F.Init(Hidden, 1);
		if (Boss)
		{
			const float K = 1.f - Boss->Windup / SmashWindup, Dia = SmashRadius * 2 * K;
			F[0] = FTransform(FRotator::ZeroRotator, ToWorld(Boss->X, Boss->Z, 0.01f), FVector(Dia, Dia, 0.02f));
		}
		WarnFill->BatchUpdateInstancesTransforms(0, F, false, true, true);
	}

	// sparks
	{
		TArray<FTransform> S; S.Init(Hidden, SparkList.Num());
		for (int32 i = 0; i < SparkList.Num(); i++)
		{
			FSpark& Sp = SparkList[i];
			if (Sp.Life <= 0) continue;
			Sp.Life -= Dt; Sp.V.Z -= 1200.f * Dt; Sp.P += Sp.V * Dt;
			if (Sp.Life > 0) S[i] = FTransform(FRotator::ZeroRotator, Sp.P, FVector(0.08f * FMath::Max(0.1f, Sp.Life / 0.3f)));
		}
		Sparks->BatchUpdateInstancesTransforms(0, S, false, true, true);
	}

	UpdateCamera(Jx, Jz, Dt);
}

void ARRArena::UpdateCamera(float Jx, float Jz, float Dt)
{
	// high and behind, following Juno, kept over the roof so the view never runs past the north edge
	const float F = 1.f - FMath::Exp(-CamDamping * Dt);
	CamX += (FMath::Clamp(Jx, -ArenaWidth / 2 + 3, ArenaWidth / 2 - 3) - CamX) * F;
	CamZ += (FMath::Clamp(Jz, -ArenaDepth / 2 + CamEdgeMargin, ArenaDepth / 2 - 3) - CamZ) * F;
	Shake = FMath::Max(0.f, Shake - Dt * 1.5f);
	HurtFlash = FMath::Max(0.f, HurtFlash - Dt * 4.f);
	const float Sh = Shake * Shake * 3.f;
	const FVector Pos = ToWorld(CamX + (FMath::FRand() - 0.5f) * Sh, CamZ + CamBack, CamHeight + (FMath::FRand() - 0.5f) * Sh);
	const FVector Look = ToWorld(CamX, CamZ - 0.8f, 0.f);
	Camera->SetWorldLocationAndRotation(Pos, (Look - Pos).Rotation());
	// Unreal's field of view is horizontal: keep the web game's 48 degrees vertical on any screen shape
	FVector2D ViewSize(1080, 1920);
	if (GEngine && GEngine->GameViewport) GEngine->GameViewport->GetViewportSize(ViewSize);
	const float Aspect = ViewSize.Y > 0 ? ViewSize.X / ViewSize.Y : 0.5f;
	Camera->SetFieldOfView(FMath::RadiansToDegrees(2.f * FMath::Atan(FMath::Tan(FMath::DegreesToRadians(CamFovDeg / 2.f)) * Aspect)));
}
