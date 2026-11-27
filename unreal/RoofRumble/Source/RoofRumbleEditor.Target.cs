using UnrealBuildTool;

public class RoofRumbleEditorTarget : TargetRules
{
	public RoofRumbleEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.V5;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("RoofRumble");
	}
}
