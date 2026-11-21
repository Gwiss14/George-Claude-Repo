#include "RRGameMode.h"
#include "RRArena.h"
#include "RRHUD.h"
#include "GameFramework/PlayerController.h"
#include "Engine/World.h"

ARRGameMode::ARRGameMode()
{
	DefaultPawnClass = nullptr; // Juno is drawn by the arena; the player only steers
	HUDClass = ARRHUD::StaticClass();
}

void ARRGameMode::StartPlay()
{
	Super::StartPlay();
	ARRArena* Arena = GetWorld()->SpawnActor<ARRArena>(FVector::ZeroVector, FRotator::ZeroRotator);
	if (APlayerController* PC = GetWorld()->GetFirstPlayerController())
	{
		PC->SetViewTarget(Arena);
		PC->bShowMouseCursor = true;
		PC->bEnableClickEvents = false;
		PC->SetInputMode(FInputModeGameOnly());
	}
}
