#include "RRSaveGame.h"
#include "Kismet/GameplayStatics.h"
#include "RRConfig.h"

URRSaveGame* URRSaveGame::LoadOrCreate()
{
	URRSaveGame* Save = nullptr;
	if (UGameplayStatics::DoesSaveGameExist(SlotName(), 0))
		Save = Cast<URRSaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName(), 0));
	if (!Save)
		Save = Cast<URRSaveGame>(UGameplayStatics::CreateSaveGameObject(URRSaveGame::StaticClass()));
	if (Save) Save->Shop.SetNumZeroed((int32)RR::EShop::Count);
	return Save;
}

void URRSaveGame::Store()
{
	UGameplayStatics::SaveGameToSlot(this, SlotName(), 0);
}
