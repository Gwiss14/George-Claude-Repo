using UnrealBuildTool;

public class RoofRumbleTarget : TargetRules
{
	public RoofRumbleTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.V5;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("RoofRumble");
	}
}
