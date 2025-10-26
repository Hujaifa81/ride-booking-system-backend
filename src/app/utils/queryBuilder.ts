import { Query } from "mongoose";
import { excludeField } from "../constants";


export class QueryBuilder<T> {
    public modelQuery: Query<T[], T>;
    public readonly query: Record<string, string>

    constructor(modelQuery: Query<T[], T>, query: Record<string, string>) {
        this.modelQuery = modelQuery;
        this.query = query;
    }

    //search based on geo location write here
    geoLocationSearch(): this {
        const { lat, lng } = this.query;
        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            this.modelQuery = this.modelQuery.find({
                location: {
                    $geoWithin: {
                        $centerSphere: [[longitude, latitude], 5 / 6378.1] // 5 km

                    }
                }
            });
        }
        return this;

    }

    dateBetweenSearch(dateField: string): this {
        const { startDate, endDate } = this.query;
        if (startDate && endDate) {
            this.modelQuery = this.modelQuery.find({
                [dateField]: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            });
        }
        if (startDate && !endDate) {
            this.modelQuery = this.modelQuery.find({
                [dateField]: {
                    $gte: new Date(startDate)
                }
            });
        }
        if (!startDate && endDate) {
            this.modelQuery = this.modelQuery.find({
                [dateField]: {
                    $lte: new Date(endDate)
                }
            });
        }
        return this;
    }


    filter(): this {
        const filter = { ...this.query };
        for (const field of excludeField) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete filter[field];
        }
        this.modelQuery = this.modelQuery.find(filter);
        return this;
    }

    search(searchFields: string[]): this {
        const searchTerm = this.query.searchTerm || '';
        const searchQuery = {
            $or: searchFields.map((field) => ({
                [field]: {
                    $regex: searchTerm, $options: "i"
                }
            }))
        };
        this.modelQuery = this.modelQuery.find(searchQuery);
        return this;
    }

    sort(): this {
        const sort = this.query.sort || "-createdAt";
        this.modelQuery = this.modelQuery.sort(sort)

        return this;
    }

    fields(): this {
        const fields = this.query.fields?.split(",").join(" ") || ""
        this.modelQuery = this.modelQuery.select(fields)

        return this;
    }

    paginate(): this {

        const page = Number(this.query.page) || 1
        const limit = Number(this.query.limit) || 10
        const skip = (page - 1) * limit

        this.modelQuery = this.modelQuery.skip(skip).limit(limit)

        return this;
    }

    build() {
        return this.modelQuery
    }

    async getMeta() {
        const query = this.modelQuery.clone(); // clone to avoid execution conflict
        const totalDocuments = await query.countDocuments();

        const page = Number(this.query.page) || 1;
        const limit = Number(this.query.limit) || 10;
        const totalPage = Math.ceil(totalDocuments / limit);

        return { page, limit, total: totalDocuments, totalPage };
    }


}