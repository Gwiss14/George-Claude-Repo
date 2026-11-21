// Every screen, drawn in code on the HUD canvas (no Widget Blueprints needed): title, run HUD with the
// ROLL button, level-up cards, pause, results and shop. Buttons register tap areas each frame; the arena
// checks touches against them.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "RRHUD.generated.h"

class ARRArena;

UCLASS()
class ARRHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;

	bool HitTest(const FVector2D& P, FName& OutId, int32& OutParam) const;
	void Banner(const FString& Text, float Seconds);
	void Pop(const FVector& World, const FString& Text, int32 Style); // 0 normal, 1 hurt, 2 big, 3 heal

	bool bStickActive = false;
	FVector2D StickOrigin, StickVec; float StickMax = 50.f;

private:
	struct FButton { FBox2D Box; FName Id; int32 Param; };
	struct FPop { FVector World; FString Text; int32 Style; float Age; };
	TArray<FButton> Buttons;
	TArray<FPop> Pops;
	FString BannerText; float BannerT = 0, BannerLen = 1;
	float Sc = 1.f; double LastTime = 0;

	ARRArena* FindArena() const;
	void Button(FName Id, int32 Param, float X, float Y, float W, float H, const FLinearColor& Fill, const FString& Label, float TextScale);
	void Panel(float X, float Y, float W, float H, const FLinearColor& Fill, float Border = 3.f);
	void Text(const FString& S, float X, float Y, float TextScale, const FLinearColor& Color, bool bCenter = true, bool bOutline = true);
	void DrawTitle(ARRArena* A);
	void DrawRun(ARRArena* A);
	void DrawLevelUp(ARRArena* A);
	void DrawPaused(ARRArena* A);
	void DrawResults(ARRArena* A);
	void DrawShop(ARRArena* A);
};
