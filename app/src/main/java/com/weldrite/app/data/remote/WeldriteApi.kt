package com.weldrite.app.data.remote

import com.weldrite.app.data.remote.dto.StoreCategoryDto
import com.weldrite.app.data.remote.dto.StoreProductDto
import retrofit2.http.GET
import retrofit2.http.Query

/** Retrofit interface for the public WooCommerce Store API on weldrite.in. */
interface WeldriteApi {

    @GET("wp-json/wc/store/v1/products")
    suspend fun getProducts(
        @Query("per_page") perPage: Int = 100,
        @Query("page") page: Int = 1,
    ): List<StoreProductDto>

    @GET("wp-json/wc/store/v1/products/categories")
    suspend fun getCategories(
        @Query("per_page") perPage: Int = 100,
    ): List<StoreCategoryDto>
}
