json.feature_available ::ThumbCrowd.mfa_enabled?
json.enabled @user.mfa_enabled?
json.backup_codes_generated @user.mfa_service.backup_codes_generated? if ::ThumbCrowd.mfa_enabled?
