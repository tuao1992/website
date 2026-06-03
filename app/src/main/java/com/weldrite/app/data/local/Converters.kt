package com.weldrite.app.data.local

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.weldrite.app.data.model.Packaging

/** Room type converters for the list-valued product fields. */
class Converters {
    private val gson = Gson()

    @TypeConverter
    fun fromStringList(value: List<String>?): String = gson.toJson(value ?: emptyList<String>())

    @TypeConverter
    fun toStringList(value: String?): List<String> {
        if (value.isNullOrBlank()) return emptyList()
        val type = object : TypeToken<List<String>>() {}.type
        return gson.fromJson(value, type)
    }

    @TypeConverter
    fun fromPackagingList(value: List<Packaging>?): String = gson.toJson(value ?: emptyList<Packaging>())

    @TypeConverter
    fun toPackagingList(value: String?): List<Packaging> {
        if (value.isNullOrBlank()) return emptyList()
        val type = object : TypeToken<List<Packaging>>() {}.type
        return gson.fromJson(value, type)
    }
}
