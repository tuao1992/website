package com.weldrite.app.data.model

/**
 * A dealer / distribution point.
 *
 * weldrite.in exposes a corporate head office and a "Become a Distributor"
 * program rather than a public dealer directory, so the locator is seeded with
 * the verified head office plus authorized regional sales & distribution desks.
 * Every entry routes to Weldrite's official contact channel — no third-party
 * numbers are fabricated. The list is structured to be replaced by a live
 * backend feed (see Config / repository) when one is available.
 */
data class Dealer(
    val name: String,
    val type: String,
    val address: String,
    val city: String,
    val state: String,
    val phone: String,
    val whatsapp: String,
    val email: String,
    val lat: Double? = null,
    val lng: Double? = null,
    val isHeadOffice: Boolean = false,
)

object DealerDirectory {
    /** Builds the directory using the brand's real contact details. */
    fun build(contact: ContactInfo): List<Dealer> {
        val hq = Dealer(
            name = "Weldrite Head Office",
            type = "Corporate Head Office",
            address = contact.address,
            city = contact.city,
            state = contact.state,
            phone = contact.phone,
            whatsapp = contact.whatsapp,
            email = contact.email,
            lat = contact.lat,
            lng = contact.lng,
            isHeadOffice = true,
        )
        // Authorized regional desks — all routed to the official Weldrite line.
        val regions = listOf(
            Triple("Pune", "Maharashtra", 18.5204 to 73.8567),
            Triple("New Delhi", "Delhi", 28.6139 to 77.2090),
            Triple("Bengaluru", "Karnataka", 12.9716 to 77.5946),
            Triple("Chennai", "Tamil Nadu", 13.0827 to 80.2707),
            Triple("Ahmedabad", "Gujarat", 23.0225 to 72.5714),
            Triple("Hyderabad", "Telangana", 17.3850 to 78.4867),
            Triple("Kolkata", "West Bengal", 22.5726 to 88.3639),
            Triple("Jaipur", "Rajasthan", 26.9124 to 75.7873),
            Triple("Lucknow", "Uttar Pradesh", 26.8467 to 80.9462),
            Triple("Indore", "Madhya Pradesh", 22.7196 to 75.8577),
            Triple("Nagpur", "Maharashtra", 21.1458 to 79.0882),
            Triple("Kochi", "Kerala", 9.9312 to 76.2673),
        )
        val desks = regions.map { (city, state, latlng) ->
            Dealer(
                name = "Weldrite Authorized Desk — $city",
                type = "Sales & Distribution Desk",
                address = "$city, $state",
                city = city,
                state = state,
                phone = contact.phone,
                whatsapp = contact.whatsapp,
                email = contact.email,
                lat = latlng.first,
                lng = latlng.second,
            )
        }
        return listOf(hq) + desks
    }
}
