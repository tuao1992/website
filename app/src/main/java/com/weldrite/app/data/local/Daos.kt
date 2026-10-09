package com.weldrite.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name ASC")
    fun observeAll(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id LIMIT 1")
    suspend fun getById(id: Int): ProductEntity?

    @Query("SELECT * FROM products WHERE category = :category ORDER BY name ASC")
    fun observeByCategory(category: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE category = :category AND id != :excludeId ORDER BY name ASC LIMIT :limit")
    suspend fun related(category: String, excludeId: Int, limit: Int): List<ProductEntity>

    @Query("SELECT COUNT(*) FROM products")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<ProductEntity>)

    /** Drops products that are no longer published on the site. */
    @Query("DELETE FROM products WHERE id NOT IN (:ids)")
    suspend fun deleteNotIn(ids: List<Int>)

    @Query("DELETE FROM products")
    suspend fun clear()
}

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories ORDER BY name ASC")
    fun observeAll(): Flow<List<CategoryEntity>>

    @Query("SELECT COUNT(*) FROM categories")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<CategoryEntity>)

    @Query("DELETE FROM categories WHERE id NOT IN (:ids)")
    suspend fun deleteNotIn(ids: List<Int>)

    @Query("DELETE FROM categories")
    suspend fun clear()
}

@Dao
interface DownloadDao {
    @Query("SELECT * FROM downloads")
    fun observeAll(): Flow<List<DownloadEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<DownloadEntity>)

    @Query("DELETE FROM downloads")
    suspend fun clear()
}
