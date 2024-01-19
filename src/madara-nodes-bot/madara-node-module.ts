// bot-trading/bot-trading.module.ts
import { Module, forwardRef } from "@nestjs/common";
import { TelegramModule } from "src/telegram/telegram.module";
import { UserModule } from "src/user/user.module";
import { MenuService } from "src/menus/menu.service";
import { MenuServiceModule } from "src/menus/menu.module";
import { SharedConfig } from "src/shared/shared-config";
import { SharedModule } from "src/shared/shared.module";
import { SecureKeyService } from "src/user/secure-key.service";
import { ConfigService } from "@nestjs/config";
import { DeployService } from "./deploy-service";
import { TokenManagementService } from "./token-management.service";
import { CloseInstanceService } from "./close-instance.service";
import { ManagementNode } from "./oganization-management";
import { StatusInstanceService } from "./status-instance.service";

@Module({
  imports: [
    forwardRef(() => TelegramModule),
    forwardRef(() => UserModule),
    forwardRef(() => MenuServiceModule),
    forwardRef(() => SharedModule),
  ],
  providers: [
    ConfigService,
    DeployService,
    TokenManagementService,
    SharedConfig,
    SecureKeyService,
    MenuService,
    CloseInstanceService,
    ManagementNode,
    StatusInstanceService
  ],

  exports: [DeployService, TokenManagementService, CloseInstanceService, ManagementNode, StatusInstanceService],
})
export class MadaraNodeBotManagement {}
