// cache.module.ts
import { Module, Global } from '@nestjs/common';
@Global()
@Module({
  providers: [
    // CacheModule.register()
    // {
    //   provide: 'CACHE_MANAGER',
    //   useFactory: () => {
    //     return cacheManager.caching({
    //       store: redisStore,
    //       host: 'localhost', // Your Redis server host
    //       port: 6379,        // Your Redis server port
    //     });
    //   },
    // },
  ],
  exports: ['CACHE_MANAGER'],
})
export class CacheModuleApp {}
