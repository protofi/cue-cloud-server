import { transform, isEqual, isObject } from 'lodash';

export async function asyncForEach(array: Array<any>, callback: (item: any, index: number, array: Array<any>) => Promise<void>)
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
export function difference(base, object) {
	return transform(object, (result, value, key) => {
		if (!isEqual(value, base[key])) {
			result[key] = isObject(value) && isObject(base[key]) ? difference(base[key], value) : value;
		}
	});
}