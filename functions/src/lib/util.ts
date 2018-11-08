import { transform, isEqual, isObject } from 'lodash';

export async function asyncForEach(array, callback)
{
    for (let index = 0; index < array.length; index++)
    {
        await callback(array[index], index, array)
    }
}

/**
 * Deep diff between two object, using lodash
 * @param  {Object} object Object compared
 * @param  {Object} base   Object to compare with
 * @return {Object}        Return a new object who represent the diff
 */
export function difference(object, base) {
	return transform(object, (result, value, key) => {
		if (!isEqual(value, base[key])) {
			result[key] = isObject(value) && isObject(base[key]) ? difference(value, base[key]) : value;
		}
	});
}

export class InstanceLoader {
    static getInstance<T>(context: Object, name: string, ...args: any[]) : T {
        var instance = Object.create(context[name].prototype);
        instance.constructor.apply(instance, args);
        return <T> instance;
    }
}