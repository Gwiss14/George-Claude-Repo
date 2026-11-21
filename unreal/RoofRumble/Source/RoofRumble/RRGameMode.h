// Builds the whole game from code at start: no map or Blueprint assets are needed.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "RRGameMode.generated.h"

UCLASS()
class ARRGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	ARRGameMode();
	virtual void StartPlay() override;
};
