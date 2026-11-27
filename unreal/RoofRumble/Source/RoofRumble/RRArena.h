// The whole game on screen: owns the run simulation, builds the roof from basic shapes,
// draws Juno and the swarm with instanced meshes, reads touch / keyboard, moves the camera,
// and runs the title, level-up, pause, results and shop screens (drawn by ARRHUD).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "RRSim.h"
#include "RRArena.generated.h"

class UCameraComponent;
class UInstancedStaticMeshComponent;
class UStaticMesh;
class UMaterialInterface;
class URRSaveGame;
class ARRHUD;

UENUM()
enum class ERRScreen : uint8 { Title, Run, LevelUp, Paused, Results, Shop };

// One body part of a person, drawn for every person of one look by a single instanced mesh.
struct FRRPart
{
	UInstancedStaticMeshComponent* Mesh = nullptr;
	FVector Pivot, Offset, Scale;   // centimetres at scale 1
	int32 Role = 0;                 // 0 legs, 1 body, 2 skin, 3 visor
	int32 Limb = 0;                 // 0 none, 1 left leg, 2 right leg, 3 left arm, 4 right arm
};

// Everything needed to pose one person this frame.
struct FRRPose
{
	FVector Pos; float YawDeg = 0, Scale = 1, BodyPitch = 0, Lift = 0;
	float LegL = 0, LegR = 0, ArmL = 0, ArmR = 0; bool bVisible = true;
};

// One look (Juno, grunt, runner, ...): seven parts, each an instanced mesh with room for Capacity people.
struct FRRLook
{
	TArray<FRRPart> Parts;
	int32 Capacity = 0;
	TArray<FRRPose> Poses;
};

UCLASS()
class ARRArena : public AActor
{
	GENERATED_BODY()

public:
	ARRArena();
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	// read by the HUD
	FRRSim Sim;
	ERRScreen Screen = ERRScreen::Title;
	ERRScreen ShopReturn = ERRScreen::Title;
	UPROPERTY() URRSaveGame* Save = nullptr;
	float ResultsTimer = -1.f;
	bool bLastWon = false, bNewBest = false;
	int32 LastEarned = 0;

	void StartRun();
	void OnButton(FName Id, int32 Param);
	FVector ToWorld(float X, float Z, float Y = 0.f) const { return FVector(-Z * 100.f, X * 100.f, Y * 100.f); }

private:
	UPROPERTY() USceneComponent* Root;
	UPROPERTY() UCameraComponent* Camera;
	UPROPERTY() UStaticMesh* CubeMesh;
	UPROPERTY() UStaticMesh* SphereMesh;
	UPROPERTY() UStaticMesh* CylinderMesh;
	UPROPERTY() UMaterialInterface* BaseMaterial;

	TArray<FRRLook> Looks;   // 0 = Juno, then one per RR::EKind
	UPROPERTY() UInstancedStaticMeshComponent* Coins;
	UPROPERTY() UInstancedStaticMeshComponent* Cans;
	UPROPERTY() UInstancedStaticMeshComponent* Wrenches;
	UPROPERTY() UInstancedStaticMeshComponent* Pipes;
	UPROPERTY() UInstancedStaticMeshComponent* Sparks;
	UPROPERTY() UInstancedStaticMeshComponent* Ring;      // stomp shockwave / boss warning edge
	UPROPERTY() UInstancedStaticMeshComponent* WarnFill;  // boss warning disc
	UPROPERTY() UStaticMeshComponent* JunoMarker;

	struct FSpark { FVector P, V; float Life = 0; };
	TArray<FSpark> SparkList;
	float StompT = 0, StompR = 2, StompX = 0, StompZ = 0;

	FRRInput Input;
	float Acc = 0, CamX = 0, CamZ = 2, Shake = 0, HurtFlash = 0, Stride = 0, Clock = 0;
	bool bPrevDown[3] = { false, false, false };
	int32 StickFinger = -1; FVector2D StickOrigin, StickVec;

	UMaterialInterface* Mat(const TCHAR* Hex);
	UStaticMeshComponent* AddStatic(UStaticMesh* Mesh, const FVector& Loc, const FVector& Scale, const TCHAR* Hex, const FRotator& Rot = FRotator::ZeroRotator, bool bShadow = true);
	UInstancedStaticMeshComponent* AddISM(UStaticMesh* Mesh, int32 Capacity, const TCHAR* Hex, bool bShadow = true);
	void BuildRoof();
	void BuildLooks();
	void ReadInput(float Dt);
	void HandleEvents();
	void Burst(const FVector& P, int32 N, float Speed);
	void Draw(float Alpha, float Dt);
	void DrawLook(FRRLook& Look);
	void UpdateCamera(float Jx, float Jz, float Dt);
	void FinishRun(bool bWon);
	ARRHUD* GetHUD() const;
};
