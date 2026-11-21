// What is kept on the phone between runs: banked coins, best time, wins, shop levels.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "RRSaveGame.generated.h"

UCLASS()
class URRSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	UPROPERTY() float Bank = 0.f;
	UPROPERTY() float Best = 0.f;
	UPROPERTY() int32 BestKills = 0;
	UPROPERTY() int32 Wins = 0;
	UPROPERTY() TArray<int32> Shop; // one level per RR::EShop

	static FString SlotName() { return TEXT("RoofRumble"); }
	static URRSaveGame* LoadOrCreate();
	void Store();
	int32 ShopLevel(int32 Index) const { return Shop.IsValidIndex(Index) ? Shop[Index] : 0; }
};
