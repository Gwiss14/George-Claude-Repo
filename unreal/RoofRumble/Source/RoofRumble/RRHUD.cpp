#include "RRHUD.h"
#include "RRArena.h"
#include "RRSaveGame.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "EngineUtils.h"

using namespace RR;

namespace
{
	const FLinearColor Ink(FColor::FromHex(TEXT("0b0b10")));
	const FLinearColor Paper(FColor::FromHex(TEXT("fff6e0")));
	const FLinearColor Accent(FColor::FromHex(TEXT("ffd23f")));
	const FLinearColor Teal(FColor::FromHex(TEXT("2fb6a8")));
	const FLinearColor Sky(FColor::FromHex(TEXT("7fe0ff")));
	const FLinearColor Green(FColor::FromHex(TEXT("3ee08f")));
	const FLinearColor Red(FColor::FromHex(TEXT("ff4a4a")));
	const FLinearColor Dim(0.f, 0.f, 0.f, 0.6f);
	FString Clock(float T) { const int32 S = FMath::Max(0, FMath::FloorToInt(T)); return FString::Printf(TEXT("%d:%02d"), S / 60, S % 60); }
}

ARRArena* ARRHUD::FindArena() const
{
	for (TActorIterator<ARRArena> It(GetWorld()); It; ++It) return *It;
	return nullptr;
}

bool ARRHUD::HitTest(const FVector2D& P, FName& OutId, int32& OutParam) const
{
	for (int32 i = Buttons.Num() - 1; i >= 0; i--) // topmost first
		if (Buttons[i].Box.IsInside(P)) { OutId = Buttons[i].Id; OutParam = Buttons[i].Param; return true; }
	return false;
}

void ARRHUD::Banner(const FString& S, float Seconds) { BannerText = S; BannerT = Seconds; BannerLen = Seconds; }

void ARRHUD::Pop(const FVector& World, const FString& S, int32 Style) { Pops.Add({ World, S, Style, 0.f }); }

// ---- drawing helpers (sizes are for a 390 x 844 phone and scale with the screen) -----------------
void ARRHUD::Panel(float X, float Y, float W, float H, const FLinearColor& Fill, float Border)
{
	const float B = Border * Sc;
	DrawRect(Ink, X + B * 1.5f, Y + B * 1.5f, W, H);          // comic drop shadow
	DrawRect(Ink, X - B, Y - B, W + 2 * B, H + 2 * B);         // outline
	DrawRect(Fill, X, Y, W, H);
}

void ARRHUD::Text(const FString& S, float X, float Y, float TextScale, const FLinearColor& Color, bool bCenter, bool bOutline)
{
	UFont* Font = GEngine->GetLargeFont();
	const float Scale = TextScale * Sc;
	float W = 0, H = 0;
	GetTextSize(S, W, H, Font, Scale);
	const float Px = bCenter ? X - W / 2 : X, Py = Y - H / 2;
	if (bOutline)
		for (const FVector2D& O : { FVector2D(2, 2), FVector2D(-1, -1), FVector2D(2, -1), FVector2D(-1, 2) })
			DrawText(S, Ink, Px + O.X * Sc, Py + O.Y * Sc, Font, Scale);
	DrawText(S, Color, Px, Py, Font, Scale);
}

void ARRHUD::Button(FName Id, int32 Param, float X, float Y, float W, float H, const FLinearColor& Fill, const FString& Label, float TextScale)
{
	Panel(X, Y, W, H, Fill, 4.f);
	Text(Label, X + W / 2, Y + H / 2, TextScale, Ink, true, false);
	Buttons.Add({ FBox2D(FVector2D(X, Y), FVector2D(X + W, Y + H)), Id, Param });
}

// ---- screens ---------------------------------------------------------------------------------------
void ARRHUD::DrawHUD()
{
	Super::DrawHUD();
	Buttons.Reset();
	ARRArena* A = FindArena();
	if (!A || !Canvas) return;
	const double Now = GetWorld()->GetRealTimeSeconds();
	const float Dt = LastTime > 0 ? (float)FMath::Min(0.1, Now - LastTime) : 0.f;
	LastTime = Now;
	Sc = FMath::Min(Canvas->ClipX / 390.f, Canvas->ClipY / 844.f);

	switch (A->Screen)
	{
	case ERRScreen::Title: DrawTitle(A); break;
	case ERRScreen::Run: DrawRun(A); break;
	case ERRScreen::LevelUp: DrawRun(A); DrawLevelUp(A); break;
	case ERRScreen::Paused: DrawRun(A); DrawPaused(A); break;
	case ERRScreen::Results: DrawResults(A); break;
	case ERRScreen::Shop: DrawShop(A); break;
	}

	// comic words floating up from where things happened
	for (FPop& P : Pops)
	{
		P.Age += Dt;
		const FVector S = Project(P.World + FVector(0, 0, P.Age * 120.f));
		const FLinearColor C = P.Style == 1 ? Red : P.Style == 3 ? Green : P.Style == 2 ? Paper : P.Style == 4 ? FLinearColor(FColor::FromHex(TEXT("ff5a3c"))) : Accent;
		if (S.Z > 0) Text(P.Text, S.X, S.Y, P.Style == 2 ? 2.2f : P.Style == 4 ? 2.f : 1.4f, C.CopyWithNewOpacity(1.f - P.Age / 0.9f));
	}
	Pops.RemoveAll([](const FPop& P) { return P.Age > 0.9f; });

	if (BannerT > 0)
	{
		BannerT -= Dt;
		Text(BannerText, Canvas->ClipX / 2, Canvas->ClipY * 0.3f, 2.6f, Accent);
	}
}

void ARRHUD::DrawTitle(ARRArena* A)
{
	const float W = Canvas->ClipX, H = Canvas->ClipY;
	Text(TEXT("ROOF"), W / 2, H * 0.2f, 4.2f, Accent);
	Text(TEXT("RUMBLE"), W / 2, H * 0.28f, 4.2f, Accent);
	const URRSaveGame* S = A->Save;
	Text(S && S->Best > 0 ? FString::Printf(TEXT("Best: %s%s"), *Clock(S->Best), S->Wins ? *FString::Printf(TEXT("  -  %d wins"), S->Wins) : TEXT("")) : FString(TEXT("Hold the roof for 5:00")), W / 2, H * 0.62f, 1.1f, Paper);
	const float Bw = 300 * Sc, Bh = 70 * Sc;
	Button(TEXT("play"), 0, W / 2 - Bw / 2, H * 0.67f, Bw, Bh, Accent, TEXT("PLAY"), 2.4f);
	Button(TEXT("shop"), 0, W / 2 - 110 * Sc, H * 0.67f + Bh + 24 * Sc, 220 * Sc, 46 * Sc, Paper, FString::Printf(TEXT("UPGRADES  %d"), S ? FMath::FloorToInt(S->Bank) : 0), 1.2f);
	Text(TEXT("Drag to move. PUNCH (J) and KICK (K): string them into combos like P P K."), W / 2, H * 0.88f, 0.7f, Paper);
	Text(TEXT("ROLL (Space) to dodge."), W / 2, H * 0.915f, 0.7f, Paper);
}

void ARRHUD::DrawRun(ARRArena* A)
{
	const FRRSim& R = A->Sim; const FRRJuno& J = R.Juno;
	const float W = Canvas->ClipX, H = Canvas->ClipY;
	// xp bar across the top, timer, health, tally, pause
	DrawRect(FLinearColor(0, 0, 0, 0.65f), 0, 0, W, 16 * Sc);
	DrawRect(Sky, 0, 0, W * FMath::Clamp(J.Xp / J.XpNeed, 0.f, 1.f), 16 * Sc);
	Text(FString::Printf(TEXT("LV %d"), J.Level), W - 30 * Sc, 8 * Sc, 0.8f, Paper);
	Text(Clock(RunLength - R.Time), W / 2, 50 * Sc, 2.4f, Paper);
	Panel(14 * Sc, 30 * Sc, 150 * Sc, 16 * Sc, FLinearColor(FColor::FromHex(TEXT("2a1d2e"))));
	DrawRect(J.Hp / J.MaxHp < 0.3f ? Red : Green, 14 * Sc, 30 * Sc, 150 * Sc * FMath::Clamp(J.Hp / J.MaxHp, 0.f, 1.f), 16 * Sc);
	Text(FString::Printf(TEXT("KO %d    $ %d"), R.Kills, FMath::FloorToInt(R.Bank)), 14 * Sc, 70 * Sc, 1.f, Paper, false);
	Button(TEXT("pause"), 0, W - 58 * Sc, 26 * Sc, 44 * Sc, 44 * Sc, Paper, TEXT("II"), 1.2f);

	// PUNCH (J) and KICK (K): big buttons for the right thumb
	const float Ab = 92 * Sc;
	const float Px = W - Ab - 18 * Sc, Py = H - Ab - 86 * Sc, Kx = Px - 100 * Sc, Ky = H - Ab - 26 * Sc;
	Panel(Px, Py, Ab, Ab, FLinearColor(FColor::FromHex(TEXT("ffd23f"))), 4.f);
	Text(TEXT("PUNCH"), Px + Ab / 2, Py + Ab * 0.45f, 1.1f, Ink, true, false);
	Text(TEXT("J"), Px + Ab / 2, Py + Ab * 0.72f, 0.7f, FLinearColor(0, 0, 0, 0.6f), true, false);
	Buttons.Add({ FBox2D(FVector2D(Px, Py), FVector2D(Px + Ab, Py + Ab)), TEXT("punch"), 0 });
	Panel(Kx, Ky, Ab, Ab, FLinearColor(FColor::FromHex(TEXT("ff7a59"))), 4.f);
	Text(TEXT("KICK"), Kx + Ab / 2, Ky + Ab * 0.45f, 1.1f, Ink, true, false);
	Text(TEXT("K"), Kx + Ab / 2, Ky + Ab * 0.72f, 0.7f, FLinearColor(0, 0, 0, 0.6f), true, false);
	Buttons.Add({ FBox2D(FVector2D(Kx, Ky), FVector2D(Kx + Ab, Ky + Ab)), TEXT("kick"), 0 });

	// hit streak, and the combo string so far (P P K ...) under the timer
	if (J.Streak >= 3) Text(FString::Printf(TEXT("%d HITS"), J.Streak), W - 70 * Sc, 130 * Sc, 1.8f, Accent);
	{
		FString Str;
		for (int32 i = 0; i < J.Keys.Len(); i++) { if (i) Str += TEXT("  "); Str += J.Keys[i] == TEXT('J') ? TEXT("P") : TEXT("K"); }
		if (Str.Len()) Text(Str, W / 2, 100 * Sc, 1.3f, Paper);
	}

	// ROLL: empties when used and refills as the cooldown runs out
	const float Rb = 70 * Sc, Rx = W - Rb - 18 * Sc, Ry = H - Rb - 196 * Sc;
	const float Cd = J.RollCd / RollCooldown;
	Panel(Rx, Ry, Rb, Rb, Cd > 0 ? FLinearColor(FColor::FromHex(TEXT("3a5a66"))) : Sky, 4.f);
	if (Cd > 0) DrawRect(Sky, Rx, Ry + Rb * Cd, Rb, Rb * (1.f - Cd));
	Text(TEXT("ROLL"), Rx + Rb / 2, Ry + Rb / 2, 1.05f, Cd > 0 ? FLinearColor(0, 0, 0, 0.6f) : Ink, true, false);
	Buttons.Add({ FBox2D(FVector2D(Rx, Ry), FVector2D(Rx + Rb, Ry + Rb)), TEXT("roll"), 0 });

	// floating stick under the thumb
	if (bStickActive)
	{
		const float R0 = StickMax;
		DrawRect(FLinearColor(1, 1, 1, 0.15f), StickOrigin.X - R0, StickOrigin.Y - R0, R0 * 2, R0 * 2);
		const FVector2D K = StickOrigin + StickVec * R0;
		DrawRect(Paper, K.X - 20 * Sc, K.Y - 20 * Sc, 40 * Sc, 40 * Sc);
	}
	// red edge flash when hurt is drawn by the arena's shake; low health blinks the bar above
}

void ARRHUD::DrawLevelUp(ARRArena* A)
{
	const FRRSim& R = A->Sim;
	const float W = Canvas->ClipX, H = Canvas->ClipY;
	DrawRect(Dim, 0, 0, W, H);
	Text(FString::Printf(TEXT("LEVEL %d!"), R.Juno.Level), W / 2, H * 0.22f, 3.f, Accent);
	Text(TEXT("Pick one"), W / 2, H * 0.29f, 1.1f, Paper);
	const float Cw = FMath::Min(W - 40 * Sc, 400 * Sc), Ch = 104 * Sc, X = W / 2 - Cw / 2;
	for (int32 i = 0; i < R.Choices.Num(); i++)
	{
		const EUp U = R.Choices[i];
		const int32 Now = U == EUp::Heal ? 0 : R.Lv(U), Next = Now + 1;
		const float Y = H * 0.34f + i * (Ch + 18 * Sc);
		Panel(X, Y, Cw, Ch, Paper, 4.f);
		Panel(X + 14 * Sc, Y + 22 * Sc, 56 * Sc, 56 * Sc, Accent, 3.f);
		Text(FString(UpName(U)).Left(1), X + 42 * Sc, Y + 50 * Sc, 2.f, Ink, true, false);
		Text(UpName(U), X + 86 * Sc, Y + 26 * Sc, 1.4f, Ink, false, false);
		Text(UpText(U, Next), X + 86 * Sc, Y + 56 * Sc, 0.8f, Ink, false, false);
		if (U != EUp::Heal)
			for (int32 p = 0; p < 5; p++) Panel(X + 86 * Sc + p * 20 * Sc, Y + 80 * Sc, 14 * Sc, 8 * Sc, p < Next ? (p == Now ? Accent : Teal) : FLinearColor(FColor::FromHex(TEXT("e8ddc8"))), 1.5f);
		Buttons.Add({ FBox2D(FVector2D(X, Y), FVector2D(X + Cw, Y + Ch)), TEXT("card"), i });
	}
}

void ARRHUD::DrawPaused(ARRArena* A)
{
	const float W = Canvas->ClipX, H = Canvas->ClipY;
	DrawRect(Dim, 0, 0, W, H);
	Text(TEXT("PAUSED"), W / 2, H * 0.35f, 3.f, Accent);
	Button(TEXT("resume"), 0, W / 2 - 150 * Sc, H * 0.45f, 300 * Sc, 70 * Sc, Accent, TEXT("RESUME"), 2.f);
	Button(TEXT("quit"), 0, W / 2 - 90 * Sc, H * 0.45f + 100 * Sc, 180 * Sc, 46 * Sc, Paper, TEXT("GIVE UP"), 1.2f);
}

void ARRHUD::DrawResults(ARRArena* A)
{
	const FRRSim& R = A->Sim;
	const float W = Canvas->ClipX, H = Canvas->ClipY;
	DrawRect(Dim, 0, 0, W, H);
	Text(A->bLastWon ? TEXT("ROOF HELD!") : TEXT("KNOCKED OUT"), W / 2, H * 0.2f, 3.f, A->bLastWon ? Green : Accent);
	const FString Labels[4] = { TEXT("TIME"), TEXT("KOS"), TEXT("LEVEL"), TEXT("COINS") };
	const FString Values[4] = { Clock(R.Time), FString::FromInt(R.Kills), FString::FromInt(R.Juno.Level), FString::Printf(TEXT("+%d"), A->LastEarned) };
	const float Bw = 160 * Sc, Bh = 80 * Sc;
	for (int32 i = 0; i < 4; i++)
	{
		const float X = W / 2 - Bw - 6 * Sc + (i % 2) * (Bw + 12 * Sc), Y = H * 0.3f + (i / 2) * (Bh + 14 * Sc);
		Panel(X, Y, Bw, Bh, Paper, 3.f);
		Text(Labels[i], X + Bw / 2, Y + 18 * Sc, 0.7f, Ink, true, false);
		Text(Values[i], X + Bw / 2, Y + 52 * Sc, 1.9f, Ink, true, false);
	}
	Text(A->bNewBest ? FString(TEXT("New best time!")) : FString::Printf(TEXT("Best: %s"), A->Save ? *Clock(A->Save->Best) : TEXT("0:00")), W / 2, H * 0.56f, 1.f, Paper);
	Button(TEXT("again"), 0, W / 2 - 150 * Sc, H * 0.62f, 300 * Sc, 70 * Sc, Accent, TEXT("PLAY AGAIN"), 2.f);
	Button(TEXT("shop"), 0, W / 2 - 100 * Sc, H * 0.62f + 96 * Sc, 200 * Sc, 46 * Sc, Paper, TEXT("UPGRADES"), 1.2f);
}

void ARRHUD::DrawShop(ARRArena* A)
{
	const float W = Canvas->ClipX, H = Canvas->ClipY;
	DrawRect(Dim, 0, 0, W, H);
	const URRSaveGame* S = A->Save;
	Text(TEXT("UPGRADES"), W / 2, H * 0.12f, 2.6f, Accent);
	Text(FString::Printf(TEXT("Kept forever. You have %d coins"), S ? FMath::FloorToInt(S->Bank) : 0), W / 2, H * 0.18f, 0.9f, Paper);
	const float Rw = FMath::Min(W - 32 * Sc, 400 * Sc), Rh = 72 * Sc, X = W / 2 - Rw / 2;
	for (int32 i = 0; i < (int32)EShop::Count; i++)
	{
		const FShopDef& D = ShopDef((EShop)i);
		const int32 L = S ? S->ShopLevel(i) : 0;
		const float Y = H * 0.23f + i * (Rh + 12 * Sc);
		Panel(X, Y, Rw, Rh, Paper, 3.f);
		Text(D.Name, X + 14 * Sc, Y + 20 * Sc, 1.3f, Ink, false, false);
		Text(ShopText((EShop)i, L), X + 14 * Sc, Y + 48 * Sc, 0.75f, Ink, false, false);
		const float Bx = X + Rw - 96 * Sc, By = Y + 14 * Sc;
		if (L >= D.Costs.Num()) Button(NAME_None, 0, Bx, By, 84 * Sc, 44 * Sc, FLinearColor(FColor::FromHex(TEXT("c9bfae"))), TEXT("MAX"), 1.1f);
		else Button(TEXT("buy"), i, Bx, By, 84 * Sc, 44 * Sc, S && S->Bank >= D.Costs[L] ? Accent : FLinearColor(FColor::FromHex(TEXT("c9bfae"))), FString::Printf(TEXT("$%d"), D.Costs[L]), 1.1f);
	}
	Button(TEXT("shop_close"), 0, W / 2 - 80 * Sc, H * 0.23f + 5 * (Rh + 12 * Sc) + 10 * Sc, 160 * Sc, 46 * Sc, Paper, TEXT("DONE"), 1.2f);
}
