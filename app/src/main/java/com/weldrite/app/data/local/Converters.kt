package com.weldrite.app.data.local

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.weldrite.app.data.model.PackagingTable

/** Room type converters for the list- and table-valued product fields. */
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
    fun fromPackagingTable(value: PackagingTable?): String = gson.toJson(value ?: PackagingTable.EMPTY)

    @TypeConverter
    fun toPackagingTable(value: String?): PackagingTable {
        if (value.isNullOrBlank()) return PackagingTable.EMPTY
        return gson.fromJson(value, PackagingTable::class.java) ?: PackagingTable.EMPTY
    }
}
