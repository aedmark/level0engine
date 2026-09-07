/**
 * Uniforms library for RectAreaLight shared webgl shaders
 *
 * BRDF data for RectAreaLight approximates Eric Heitz's Linearly Transformed
 * Cosines (LTC) fit using two 64x64 lookup tables (16,384 float32 entries
 * each). They are stored as raw binary files under assets/ltc/ and fetched
 * here rather than embedded as JS array literals — the decimal-text source
 * was ~300KB and cost a full JS-parse of ~32k numeric tokens on every load.
 */

async function loadLTCTable( url ) {

	const response = await fetch( url );
	if ( ! response.ok ) throw new Error( `Failed to load ${ url }: HTTP ${ response.status }` );
	return new Float32Array( await response.arrayBuffer() );

}

const [ LTC_MAT_1, LTC_MAT_2 ] = await Promise.all( [
	loadLTCTable( './assets/ltc/ltc_mat_1.bin' ),
	loadLTCTable( './assets/ltc/ltc_mat_2.bin' )
] );

class RectAreaLightUniformsLib {

	static init() {

		const ltc_float_1 = new Float32Array( LTC_MAT_1 );
		const ltc_float_2 = new Float32Array( LTC_MAT_2 );

		THREE.UniformsLib.LTC_FLOAT_1 = new THREE.DataTexture( ltc_float_1, 64, 64, THREE.RGBAFormat, THREE.FloatType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.NearestFilter, 1 );
		THREE.UniformsLib.LTC_FLOAT_2 = new THREE.DataTexture( ltc_float_2, 64, 64, THREE.RGBAFormat, THREE.FloatType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.NearestFilter, 1 );

		THREE.UniformsLib.LTC_FLOAT_1.needsUpdate = true;
		THREE.UniformsLib.LTC_FLOAT_2.needsUpdate = true;

		const ltc_half_1 = new Uint16Array( LTC_MAT_1.length );

		LTC_MAT_1.forEach( function ( x, index ) {

			ltc_half_1[ index ] = THREE.DataUtils.toHalfFloat( x );

		} );

		const ltc_half_2 = new Uint16Array( LTC_MAT_2.length );

		LTC_MAT_2.forEach( function ( x, index ) {

			ltc_half_2[ index ] = THREE.DataUtils.toHalfFloat( x );

		} );

		THREE.UniformsLib.LTC_HALF_1 = new THREE.DataTexture( ltc_half_1, 64, 64, THREE.RGBAFormat, THREE.HalfFloatType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.NearestFilter, 1 );
		THREE.UniformsLib.LTC_HALF_2 = new THREE.DataTexture( ltc_half_2, 64, 64, THREE.RGBAFormat, THREE.HalfFloatType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.NearestFilter, 1 );

		THREE.UniformsLib.LTC_HALF_1.needsUpdate = true;
		THREE.UniformsLib.LTC_HALF_2.needsUpdate = true;


	}

}

export { RectAreaLightUniformsLib };
