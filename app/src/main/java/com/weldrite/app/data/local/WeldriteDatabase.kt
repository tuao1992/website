package com.weldrite.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [ProductEntity::class, CategoryEntity::class, DownloadEntity::class],
    // v2: generic packaging table + usage steps. The DB is a cache of public content,
    // so the destructive fallback simply re-seeds it from assets on upgrade.
    version = 2,
    exportSchema = false,
)
@TypeConverters(Converters::class)
abstract class WeldriteDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun categoryDao(): CategoryDao
    abstract fun downloadDao(): DownloadDao

    companion object {
        @Volatile private var INSTANCE: WeldriteDatabase? = null

        fun get(context: Context): WeldriteDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(
                context.applicationContext,
                WeldriteDatabase::class.java,
                "weldrite.db"
            ).fallbackToDestructiveMigration().build().also { INSTANCE = it }
        }
    }
}
